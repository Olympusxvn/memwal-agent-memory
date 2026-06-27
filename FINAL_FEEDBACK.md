# FINAL_FEEDBACK — MemWal Agent Memory (technical)

**Project:** [MemWal Agent Memory](https://github.com/Olympusxvn/memwal-agent-memory)  
**Scope:** Hybrid memory platform + `@memwalpp/mcp` MCP server (v1.0 + v1.1)  
**Audience:** MemWal / Walrus maintainers, integrators, and reviewers  
**Last updated:** June 2026

---

## Executive summary

We built a **production-oriented hybrid memory layer** on top of the official MemWal SDK: local SQLite for speed and privacy, Walrus for durable verifiable storage, and an MCP server so any compatible agent (Cursor, Claude Desktop, OpenClaw) can use the same API without importing monorepo packages.

**What works well today**

- End-to-end hybrid flow: **Local → Redaction → Quality Gate → Walrus** with no client-side bypass.
- MCP **stdio E2E** runs without secrets (`pnpm mcp:e2e`, exit 0).
- **45 MCP tests** + core/client/shared coverage for sync, search, verify, and lineage.
- Read-only **Sui RPC** enrichment for verify and lineage (no owner keys in MCP path).

**Honest limits**

- Live Walrus blob index lookup is **best-effort** until MemWal exposes a stable blob-existence API; we degrade gracefully when the index is unavailable.
- On-chain lineage reads depend on `memory_ext` dynamic fields and mainnet RPC latency.
- Marketplace / chain **write** tools are intentionally **out of MCP v1** scope.

---

## Architecture we shipped

```
MCP client (stdio | Streamable HTTP)
        │
        ▼
@memwalpp/mcp          transport · auth · rate-limit · Zod schemas
        │
        ▼
@memwalpp/core         MemorySyncService (orchestration)
   ├── @memwalpp/local-memory   SQLite · redaction · semantic score
   └── @memwalpp/memwal-client  DurableMemoryStore · ChainReader (read-only)
```

**Design principle:** MCP must not reimplement redaction, quality scoring, or sync logic. All policy lives in `@memwalpp/core` and `@memwalpp/local-memory` (ADR-010, OpenSpec S-1).

---

## MCP v1 tool surface (10 tools)

| Tool | Purpose |
|------|---------|
| `remember` | Local write; optional `redactLocal` before SQLite persist |
| `recall` | Hybrid pull — local first, optional durable hydrate |
| `search` | Ranked hybrid search with `score`, `hitSource`, `verifiable` |
| `sync` | Promote pending rows — **unskippable** redaction + quality gate |
| `saveArtifact` | JSON/markdown report with `artifact: true` metadata |
| `getVersionHistory` | Timeline from `metadata.versionHistory` + durable merge |
| `getLineage` | Local ancestry graph + optional Sui pack lineage (metadata only) |
| `verify` | Layered check: local proof → Walrus blob → on-chain refs |
| `softDelete` | Tombstone (`metadata.deleted=1`) |
| `getStats` | Row counts and `durableLive` |

Full schemas: [`packages/mcp/docs/TOOLS.md`](packages/mcp/docs/TOOLS.md)

---

## v1.1 polish phases (complete)

| Phase | Deliverable | Primary packages |
|-------|-------------|------------------|
| **1.1a** | Phone regex false-positive fix in PII redaction | `local-memory` |
| **1.1g** | Optional `remember.redactLocal` | `shared`, `core`, `mcp` |
| **1.1f** | HTTP hardening — per-session registry, bearer auth, rate limits | `mcp` |
| **1.1b** | Hybrid ranked `search` | `local-memory`, `core`, `mcp` |
| **1.1e** | Real `getVersionHistory` via metadata index | `shared`, `core`, `mcp` |
| **1.1c** | Layered `verify` (local + Walrus + Sui RPC) | `memwal-client`, `core`, `mcp` |
| **1.1d** | Lineage graph + `readPackLineage` | `shared`, `core`, `memwal-client`, `mcp` |

OpenSpec status: [`docs/specs/openspec-mcp-server.md`](docs/specs/openspec-mcp-server.md) §15

---

## Feedback for MemWal SDK / relayer

### 1. Blob verification API

**Observation:** After `remember()`, we often have a `jobId` before a final `blobId`. Verifying blob presence on Walrus without a first-class index forces heuristics (`walrus_index_unavailable`).

**Request:** Document (or expose) a supported **read path** to confirm blob existence by id, or a job→blob status poll with stable semantics.

**Our workaround:** `DurableMemoryStore.verifyBlob()` — returns `found: false` with reason when index unavailable; layered `verify` still passes if local proof + `synced=true` align.

### 2. Namespace and multi-tenant cookbook

**Observation:** Production apps (e.g. [special-one-agent](https://github.com/Olympusxvn/special-one-agent)) need per-wallet namespaces. MCP uses `MEMWAL_NAMESPACE` as a single active partition.

**Request:** Official pattern for **namespace per tenant** + delegate key rotation without duplicating relayer config.

**Our approach:** Namespace string on every `MemoryRecord`; MCP default `default`; product docs recommend per-project or per-user namespaces.

### 3. Async promotion semantics

**Observation:** `synced: true` when either `blobId` or `jobId` is returned avoids duplicate pushes but makes “verifiable” ambiguous until blob id is known.

**Request:** Clear contract: when is a memory **durable-complete** vs **accepted-async**?

**Our approach:** `verifiable: true` on search hits only when local row has `synced` + `walrusBlobId`; version history records both `created` and `promoted` events.

### 4. Error taxonomy

**Observation:** Integrators need to distinguish config errors, rate limits, and transport failures for retry logic.

**Positive:** `MemWalConfigError`, `MemWalRateLimitError`, and `shouldRetryMemWalError()` in `@memwalpp/memwal-client` helped unify handling.

**Request:** Keep stable error codes across SDK minor versions for automation.

### 5. OpenClaw plugin vs MCP

**Observation:** Teams use **either** `@mysten-incubation/oc-memwal` **or** MCP, rarely both in one process.

**Our stance:** MCP is the **framework-neutral** path; OpenClaw hooks remain in `apps/agent-swarm` for NemoClaw demos. Shared core prevents drift.

---

## Draft GitHub issues for MystenLabs/MemWal (not filed yet)

Two issues below are **ready to paste** into [MystenLabs/MemWal/issues/new](https://github.com/MystenLabs/MemWal/issues/new). Search the tracker first for duplicates (`blob verify`, `jobId`, `durable-complete`).

| Draft | Target repo | Labels (suggested) | Status |
|-------|-------------|-------------------|--------|
| [Issue A — Blob verify / job status](#issue-a--document-or-expose-blob-verification--job--blob-status) | `MystenLabs/MemWal` | `documentation`, `enhancement` | **Draft — do not file until reviewed** |
| [Issue B — Async promotion semantics](#issue-b--clarify-durable-complete-vs-accepted-async) | `MystenLabs/MemWal` | `documentation` | **Draft — do not file until reviewed** |

**Reference commit:** [`1cb25d9`](https://github.com/Olympusxvn/memwal-agent-memory/commit/1cb25d9) · **Repro:** `pnpm mcp:e2e` (mock: `MEMWAL_MCP_MOCK_DURABLE=1`)

---

### Issue A — Document or expose blob verification + job → blob status

**Title:** `Document supported blob verification and job→blob status for integrators`

**Labels:** `documentation`, `enhancement`

**Body:**

```markdown
## Summary

Integrators building hybrid wrappers (local cache + MemWal durable layer) need a **supported, documented way** to confirm that a Walrus blob exists after `remember()`, or to poll from `jobId` → final `blobId`. Without this, verify/trust UIs must use heuristics or skip the Walrus layer entirely.

## Context

We wrap MemWal in [memwal-agent-memory](https://github.com/Olympusxvn/memwal-agent-memory) (`@memwalpp/memwal-client` → `DurableMemoryStore`). Our MCP `verify` tool exposes a three-layer check: local proof → Walrus blob → optional Sui on-chain refs.

Reference: [FINAL_FEEDBACK.md § Blob verification](https://github.com/Olympusxvn/memwal-agent-memory/blob/main/FINAL_FEEDBACK.md) · commit `1cb25d9`

## Problem

1. After `remember()` / relayer push, we often receive a **`jobId` before `blobId`** is known.
2. There is no documented **read API** to confirm blob existence by id on Walrus (or via MemWal) from the SDK/relayer.
3. Our wrapper returns `verifyBlob()` with `found: false` and reason `walrus_index_unavailable` when we cannot confirm upstream — even when local state says `synced: true`.

This forces integrators to either:
- Treat “synced” as “trust me”, or
- Re-implement undocumented relayer endpoints, or
- Weaken verify UX.

## Expected

One of (or a documented combination of):

- [ ] **Document** the supported path to verify a blob id exists (relayer endpoint, SDK method, or Walrus read pattern blessed by MemWal).
- [ ] **Document** job status polling: `jobId` → `{ pending | complete | failed }` → `blobId`.
- [ ] Clarify **SLA / timing**: typical latency from `remember()` accept to `blobId` availability.

## Actual (our workaround)

In `packages/memwal-client/src/durable/durable-memory-store.ts`:

- `LiveDurableMemoryStore.verifyBlob()` checks relayer health but cannot confirm blob presence without an index → `reasons: ["walrus_index_unavailable"]`.
- Layered verify in `packages/core/src/memory/verify-memory.ts` may still report `valid: true` when local proof + `synced` align, but **`walrus.found` stays false** — confusing for “verifiable memory” product copy.

## Minimal repro (wrapper repo)

```bash
git clone https://github.com/Olympusxvn/memwal-agent-memory.git
cd memwal-agent-memory
pnpm install && pnpm mcp:build

# Offline-safe (mock durable):
MEMWAL_MCP_MOCK_DURABLE=1 pnpm --filter @memwalpp/mcp test -t "verify"

# Live (requires MEMWAL_PRIVATE_KEY + MEMWAL_ACCOUNT_ID + relayer):
# remember → sync → verify({ memoryId, checkWalrus: true })
```

## Suggested SDK surface (optional)

Not prescriptive — examples only:

```ts
// Option A: poll job
await memwal.waitForJob(jobId): { status, blobId?, error? }

// Option B: verify blob
await memwal.verifyBlob(blobId): { exists: boolean, ... }

// Option C: document relayer GET /jobs/:id and /blobs/:id semantics
```

## Environment

- Package: `@mysten-incubation/memwal` (via our `@memwalpp/memwal-client`)
- Relayer: mainnet (`MEMWAL_SERVER_URL` / workshop defaults)
- SDK consumer: hybrid MCP server + `MemorySyncService.pushOne()`

## Why this matters

Hackathon/judge flows and production agents advertise **“verifiable Walrus memory”**. Without a blessed verify path, every integrator reinvents partial solutions and users cannot distinguish “accepted by relayer” from “durable on Walrus”.
```

---

### Issue B — Clarify durable-complete vs accepted-async

**Title:** `Clarify when a remember() result is durable-complete vs accepted-async (jobId vs blobId)`

**Labels:** `documentation`

**Body:**

```markdown
## Summary

The SDK/relayer response from `remember()` can indicate success with **`jobId` only** (no `blobId` yet). Integrators need an official **state machine** so hybrid layers know when to set `synced`, when to expose `walrusBlobId`, and when it is honest to label a memory **verifiable**.

## Context

[memwal-agent-memory](https://github.com/Olympusxvn/memwal-agent-memory) implements hybrid sync in `MemorySyncService.pushOne()` and exposes MCP tools `sync`, `search`, `getVersionHistory`, and `verify`.

Reference: [FINAL_FEEDBACK.md § Async promotion](https://github.com/Olympusxvn/memwal-agent-memory/blob/main/FINAL_FEEDBACK.md) · commit `1cb25d9`

## Problem

Today we infer:

```ts
synced = Boolean(durableResult.blobId || durableResult.jobId)
```

That avoids duplicate pushes on the next `syncPending()`, but it collapses two different states:

| State | Meaning (integrator view) | What we have today |
|-------|---------------------------|-------------------|
| **Accepted-async** | Relayer queued work; blob id unknown | `jobId` set, `synced: true` |
| **Durable-complete** | Blob id known; Walrus path complete | `blobId` set, `synced: true` |

Downstream effects in our wrapper:

- `search` → `verifiable: true` only when `synced && walrusBlobId` (we had to add this rule ourselves).
- `getVersionHistory` → `promoted` event may fire before `blobId` is stable.
- `verify` → Walrus layer ambiguous when `checkWalrus: true` but blob id missing.
- UX copy: agents say “synced to Walrus” when we only have a job handle.

## Expected

Official documentation (README or SDK types) defining:

1. **Fields returned** from `remember()` — always/ sometimes `jobId`, `blobId`, both?
2. **Terminal states** — when is the write safe to treat as durable for recall/verify?
3. **Idempotency** — if client retries `remember()` with same content/namespace, what happens?
4. **Recommended integrator pattern** — e.g. poll until `blobId`, or subscribe, or fire-and-forget with explicit “pending” flag.

A small state diagram in docs would be enough to align wrappers like ours and `@mysten-incubation/oc-memwal`.

## Our workaround (may diverge from intent)

In `@memwalpp/core`:

- `synced: true` when `blobId || jobId` (handoff to durable pipeline).
- `verifiable: true` only when `synced && walrusBlobId` (stricter, user-facing).
- `metadata.walrusPending: "1"` when job accepted but blob id absent.
- Version history records `promoted` at push time with optional `jobId`.

Document whether this matches MemWal’s intended contract or we should keep `synced: false` until `blobId`.

## Minimal repro

```bash
git clone https://github.com/Olympusxvn/memwal-agent-memory.git
cd memwal-agent-memory
pnpm install && pnpm mcp:build
pnpm mcp:e2e
# With live MEMWAL_* env: inspect row after sync — jobId set, blobId may lag
```

Relevant code paths:

- `packages/core/src/memory/memory-sync-service.ts` — `pushOne()`
- `packages/mcp/docs/VERIFY.md` — layered verify expectations

## Questions for maintainers

1. Should integrators **block** until `blobId`, or is job-only accept intentional for latency?
2. Is there a **canonical pending flag** in SDK responses we should map instead of inventing `walrusPending`?
3. Does `recall()` against durable layer require `blobId`, or can it resolve from `jobId`?

## Why this matters

Hybrid local+Walrus products (MCP, OpenClaw plugin, serverless agents) need one shared vocabulary for “saved locally” vs “durable on Walrus” vs “verifiable”. Without it, every wrapper guesses differently and judges/users see inconsistent behavior.
```

---

## Privacy and security (what we enforced)

| Control | Implementation |
|---------|----------------|
| **S-1** | Reject bypass flags (`skipRedaction`, `bypassGate`, …) at MCP boundary |
| **ADR-002** | Refuse owner keys at startup; delegate keys only |
| **Redaction default** | On durable sync; optional `redactLocal` on local persist |
| **HTTP S-5** | Bearer required for `[W]` and `[D]` tools |
| **Logging** | No raw memory content; correlation id + memory id only |
| **Lineage S-8** | `getLineage` returns metadata graph only — no sealed content |

Details: [`packages/mcp/docs/SECURITY.md`](packages/mcp/docs/SECURITY.md)

---

## On-chain read path (verify + lineage)

We added a read-only **`ChainReader`** (`@memwalpp/memwal-client`):

| Method | Reads |
|--------|--------|
| `verifyMemoryRefs()` | `MemoryPack.blob_ids`, bounty fulfillment blobs, tx digest status |
| `readPackLineage()` | `memory_ext` dynamic field — parent, root, fork depth, ancestors |

**Env:** `SUI_NETWORK` (default `mainnet`). No signing keys required for these MCP read tools.

**Limitation:** v1 packs without `PackExt` dynamic field return default lineage (`forkDepth: 0`) — consistent with Move `default_lineage()`.

---

## Testing and reproducibility

```bash
pnpm install
pnpm mcp:build
pnpm mcp:e2e                    # stdio: remember → recall → sync → verify
pnpm --filter @memwalpp/mcp test   # 45 tests (handlers, HTTP, auth, rate limit, E2E)
pnpm --filter @memwalpp/core test  # sync, verify, lineage
pnpm --filter @memwalpp/shared test
pnpm --filter @memwalpp/memwal-client test
```

**Mock durable:** `MEMWAL_MCP_MOCK_DURABLE=1` — in-process Walrus for CI and judges without relayer keys.

---

## What we would do differently (next iteration)

1. **Indexer worker** — Postgres schema exists (`docs/specs/indexer-schema.sql`); wire Move events → lineage/version tables for dashboard, not hot-path MCP reads.
2. **MCP v2 tools** — Register marketplace PTBs behind explicit opt-in; keep v1 lean for privacy-focused agents.
3. **Blob index** — Replace verify heuristics once MemWal documents canonical lookup.
4. **Seal gating** — Metadata slots reserved (`sealPolicyId`); full Seal PTB composition remains orchestration-layer work.

---

## Related documents

| Document | Purpose |
|----------|---------|
| [`packages/mcp/README.md`](packages/mcp/README.md) | MCP install, config, architecture |
| [`packages/mcp/docs/TOOLS.md`](packages/mcp/docs/TOOLS.md) | Tool reference |
| [`docs/mcp-setup.md`](docs/mcp-setup.md) | Cursor / Claude Desktop setup |
| [`docs/specs/openspec-mcp-server.md`](docs/specs/openspec-mcp-server.md) | Canonical OpenSpec |
| [`SUBMISSION.md`](SUBMISSION.md) | Hackathon submission narrative |
| [`docs/companion-mvp-special-one-agent.md`](docs/companion-mvp-special-one-agent.md) | Production MVP ↔ platform map |

---

## Contact / attribution

Built for **Sui Overflow 2026 (Walrus track)** and **Walrus Sessions 4 — Memory World Cup** companion apps. We **wrap** [MystenLabs/MemWal](https://github.com/MystenLabs/MemWal); we do not fork the SDK.

For MemWal product feedback, draft issues live in [§ Draft GitHub issues](#draft-github-issues-for-mystenlabsmemwal-not-filed-yet) above. File on [MystenLabs/MemWal](https://github.com/MystenLabs/MemWal/issues) after review, with reproduction steps from this monorepo.
