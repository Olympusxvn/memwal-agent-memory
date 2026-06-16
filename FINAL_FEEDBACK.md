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
- **42 MCP tests** + core/client/shared coverage for sync, search, verify, and lineage.
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

## MCP v1 tool surface (9 tools)

| Tool | Purpose |
|------|---------|
| `remember` | Local write; optional `redactLocal` before SQLite persist |
| `recall` | Hybrid pull — local first, optional durable hydrate |
| `search` | Ranked hybrid search with `score`, `hitSource`, `verifiable` |
| `sync` | Promote pending rows — **unskippable** redaction + quality gate |
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
pnpm --filter @memwalpp/mcp test   # 42 tests (handlers, HTTP, auth, rate limit)
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

For MemWal product feedback, we file issues on [MystenLabs/MemWal](https://github.com/MystenLabs/MemWal/issues) with reproduction steps from this monorepo where applicable.
