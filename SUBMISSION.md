# MemWal Agent Memory — Sui Overflow 2026 · Walrus Track

[![Sui Overflow 2026](https://img.shields.io/badge/Sui_Overflow-2026-6fbcff)](https://overflow.sui.io)
[![Walrus Track](https://img.shields.io/badge/Walrus-Track-4ade80)](https://mystenlabs.notion.site/walrus-track-problem-statement)
[![Sui](https://img.shields.io/badge/Sui-Mainnet-4DA2FF)](https://sui.io)
[![Walrus](https://img.shields.io/badge/Walrus-Durable_Memory-7C3AED)](https://www.walrus.xyz)
[![GitHub](https://img.shields.io/badge/repo-memwal--agent--memory-181717?logo=github)](https://github.com/Olympusxvn/memwal-agent-memory)

| | |
|---|---|
| **Repository** | https://github.com/Olympusxvn/memwal-agent-memory |
| **Live demo (dashboard)** | https://memwalpp-dashboard.vercel.app/ |
| **Judge runbook (start here)** | [`JUDGE_GUIDE.md`](JUDGE_GUIDE.md) — **5–10 minutes**, no API keys required |
| **Architecture** | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [SVG diagram](docs/diagrams/memwalpp-merged-architecture.svg) |
| **Master OpenSpec** | [`docs/specs/openspec-memwal-agent-memory.md`](docs/specs/openspec-memwal-agent-memory.md) |

---

## 1. Problem

Autonomous agents need memory that is:

- **Fast** during inference (local recall, not round-trips per token)
- **Safe** before sharing (PII redaction, quality gates)
- **Verifiable** when money or reputation is at stake (Walrus proofs, on-chain refs)

Chat logs and opaque databases fail judges and marketplaces: there is no durable blob id, no escrow tied to fulfillment, no portable pack an agent can buy or fork.

---

## 2. Solution (one paragraph)

**MemWal Agent Memory** is a **hybrid verifiable memory layer** and **memory economy**: agents read/write **SQLite-local** memory first, promote only redacted, quality-scored rows to **MemWal → Walrus**, and anchor packs and bounties on **Sui Move** (MemoryPack NFT, marketplace, WAL escrow bounties with `walrus_blob_id` fulfillment). OpenClaw-style hooks wire the story in runnable demos; a **universal MCP Server** (`@memwalpp/mcp`) exposes the same layer to any MCP-compatible agent without importing our packages.

---

## 3. Walrus value (why this track)

Walrus is on the **critical path**, not marketing copy:

| Walrus track ask | MemWal Agent Memory delivery |
|------------------|------------------------------|
| Durable blob storage | `DurableMemoryStore.remember()` → MemWal relayer → **Walrus** |
| Verifiable recall | `pullQuery` / MemWal semantic search → hydrate local cache |
| Agent integration | `pnpm agent:demo`, `pnpm agent:bounty-hunt` (exit 0 offline) |
| Proof surface | `MemoryRecord.walrusBlobId` + `bounty::submit_fulfillment(walrus_blob_id)` |
| Privacy before upload | `redactForUpstream` in `MemorySyncService` **before** push |

```
LocalMemoryStore → redactForUpstream → quality gate → MemWal remember → Walrus blob
                                                              ↓
                                                    walrusBlobId on record + bounty
```

**Code path (30 s skim):** `packages/core/src/memory/memory-sync-service.ts` · `packages/memwal-client/src/durable/durable-memory-store.ts`

---

## 4. Demo flow (judge — ~3 min)

```bash
git clone https://github.com/Olympusxvn/memwal-agent-memory.git && cd memwal-agent-memory
pnpm install
pnpm agent:demo
pnpm agent:bounty-hunt
```

| Step | What happens | Walrus tie-in |
|------|----------------|---------------|
| 1 | Seed bounty text → local store | Local-first |
| 2 | `pushOne` (redact + gate) | Promotes to MemWal/Walrus when `MEMWAL_*` set; offline skip is OK |
| 3 | `beforeRemember` | Injects `## Memory context` from hybrid recall |
| 4 | `afterThink` | Captures agent memory row |
| 5 | `onTaskComplete` | `syncPending` + outcome stub (ADR-005) |
| 6 | **bounty-hunt** | Poster + Hunter agents; same sync path |

**Expected console:** colored `[1/N]` steps → `── RESULT ──` → **exit code 0**.

**Optional live Walrus (~2 min):** copy [`.env.example`](.env.example), set `MEMWAL_PRIVATE_KEY`, `MEMWAL_ACCOUNT_ID`, `MEMWAL_SERVER_URL`, then:

```bash
MEMWAL_AUTO_PUSH=1 pnpm agent:bounty-hunt
```

Look for `✓ Promoted — blob …` in poster step 3.

---

## 5. Why this deserves to win Walrus Track

1. **End-to-end Walrus narrative** — from agent hook to `walrusBlobId` to Move bounty fulfillment id.  
2. **Judge-first UX** — strongest demos run **without secrets**; live blob ids are one env block away.  
3. **Hybrid architecture done right** — ADR-010 durable-wins on sealed content; not “sync everything.”  
4. **Economy + storage** — mainnet Move package (marketplace, escrow bounty, NFT pack) **plus** Walrus durability.  
5. **Engineering depth** — OpenSpecs, ADRs, Vitest, `sui move test`, CI — not a slide deck repo.  
6. **Clear roadmap forward** — MCP universal access ✓, Move v2 in repo ✓, live chain PTBs wired (v1 mainnet + v2 after operator bootstrap).

---

## 6. Key features (by phase)

| Phase | Deliverable | Status |
|-------|-------------|--------|
| **0–1** | Monorepo, `shared`, `local-memory`, SQLite + redact/score | ✓ |
| **2** | `MemWalClient`, `DurableMemoryStore`, `MemorySyncService` | ✓ |
| **3** | Move v1: `memory_nft`, `marketplace`, `bounty`, `royalty`, `delegate_bridge`, `access_policy` | ✓ mainnet |
| **4** | `MemWalAgentBridge`, agent demos, optional live bounty PTB | ✓ |
| **5** | Master OpenSpec, `PROJECT.md`, `ARCHITECTURE.md`, `ROADMAP.md` | ✓ |
| **6** | MCP Server — memory + chain tools, stdio E2E | ✓ |
| **7** | Move v2 refactor (upgrade-in-place, tests) | ✓ repo |
| **8** | Dashboard kiosk PTBs, chain client | ◐ partial |
| **9** | Submission polish (this doc, judge guide) | ◐ |

See [`ROADMAP.md`](ROADMAP.md) for full phase breakdown.

---

## 7. On-chain (Sui Mainnet)

| | |
|---|---|
| **Package ID** | `0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050` |
| **Suiscan** | https://suiscan.xyz/mainnet/object/0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050 |
| **Marketplace** | `0x7dea19c34022cc7d28d21bfef75859bd6704f8fbd9bc7ea00c787052f895d548` |
| **Interact** | [`docs/deploy.md`](docs/deploy.md) · `pnpm contracts:info` |

Move v2 refactor (versioning, lineage, bounty v2) upgrades **in-place** via existing UpgradeCap — package ID unchanged. Operator scripts: `pnpm contracts:upgrade-v2` then `pnpm contracts:bootstrap-v2`. See [`docs/deploy.md`](docs/deploy.md).

---

## 8. Tech stack

MemWal · Walrus · Sui Move · TypeScript monorepo (Turborepo) · OpenClaw/NemoClaw hooks · **MCP Server** (`@memwalpp/mcp`) · Next.js dashboard.

---

## 9. Verification

```bash
pnpm check && pnpm build && pnpm test
pnpm mcp:e2e           # MCP stdio E2E
pnpm contracts:test    # Sui CLI — 8 Move tests (v2 + v1)
```

---

## 10. Future work

Indexer + live Kiosk listings · mainnet v2 bootstrap (operator) · Seal PTB composition · published OpenClaw plugin npm package.

---

## 11. AI disclosure

Built with AI assistants (Cursor, Claude) per **ADR-012**. All material decisions are in [`docs/decisions/`](docs/decisions/).

---

## 12. Doc index

| Document | Use |
|----------|-----|
| [`JUDGE_GUIDE.md`](JUDGE_GUIDE.md) | Step-by-step judge path |
| [`README.md`](README.md) | Contributor setup |
| [`PROJECT.md`](PROJECT.md) | Vision and goals |
| [`docs/deploy.md`](docs/deploy.md) | Move PTB + object IDs |
| [`docs/specs/openspec-memwal-agent-memory.md`](docs/specs/openspec-memwal-agent-memory.md) | Master OpenSpec |
| [`docs/specs/openspec-move-contracts.md`](docs/specs/openspec-move-contracts.md) | Move v1 OpenSpec |
| [`ROADMAP.md`](ROADMAP.md) | Phase status |
