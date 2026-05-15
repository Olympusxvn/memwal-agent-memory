# MemWal++ — Sui Overflow 2026 · Walrus Track

[![Sui Overflow 2026](https://img.shields.io/badge/Sui_Overflow-2026-6fbcff)](https://overflow.sui.io)
[![Walrus Track](https://img.shields.io/badge/Walrus-Track-4ade80)](https://mystenlabs.notion.site/walrus-track-problem-statement)
[![GitHub](https://img.shields.io/badge/GitHub-Olympusxvn%2Fmemwalpp-181717?logo=github)](https://github.com/Olympusxvn/memwalpp)

**Repo:** https://github.com/Olympusxvn/memwalpp  
**Judge quick start:** [`JUDGE_GUIDE.md`](JUDGE_GUIDE.md) (5–10 min)

---

## Problem

AI agents need memory that is **fast locally**, **safe to share**, and **verifiable on durable storage**. Chat history and centralized databases are neither portable nor proof-friendly for marketplaces and bounties.

---

## Solution

**MemWal++** — a **hybrid memory economy** for autonomous agents:

| Layer | Role |
|-------|------|
| **Local** | SQLite / in-memory, quality scoring, PII redaction |
| **Durable** | [MemWal](https://docs.memwal.ai) → **Walrus** encrypted blobs |
| **On-chain** | Sui Move — MemoryPack NFT, marketplace, bounty, royalties |

Agents work local-first; only **quality-gated, redacted** memories promote to Walrus via MemWal.

---

## Walrus usage (critical path)

```
Agent hooks → MemorySyncService → redactForUpstream → MemWal remember → Walrus blob
                                                      ↓
                                            MemoryRecord.walrusBlobId
```

| Step | Implementation |
|------|----------------|
| Write to Walrus | `DurableMemoryStore.remember()` → `@mysten-incubation/memwal` relayer |
| Blob reference | `MemoryRecord.walrusBlobId` after `pushOne()` |
| Recall / hydrate | `pullQuery()` — local cache + MemWal semantic search |
| Privacy | `redactForUpstream` in `@memwalpp/core` **before** any durable write |
| Judge proof | `pnpm agent:demo` step 3 — prints blob id when `MEMWAL_*` is set |

Encryption is handled by the MemWal relayer; this repo never pushes raw PII upstream.

---

## Key features

- **`MemorySyncService`** — bidirectional local ↔ MemWal sync (ADR-010)
- **`MemWalAgentBridge`** — `beforeRemember`, `afterThink`, `onTaskComplete` (ADR-011)
- **`pnpm agent:demo`** / **`pnpm agent:bounty-hunt`** — offline-safe, structured logs
- **Move contracts** (mainnet) — `memory_nft`, `marketplace`, `bounty`, `royalty`, `wal`, `delegate_bridge`, `access_policy`
- **Monorepo** — Turborepo, CI, OpenSpecs, ADRs

---

## Demo flow (what you will see)

```bash
pnpm install
pnpm agent:demo          # ~1 min — hybrid hooks + Walrus narrative
pnpm agent:bounty-hunt   # ~1 min — poster + hunter agents
```

1. **Seed** bounty requirement → local store  
2. **pushOne** → redact + quality gate → MemWal (offline: skip is expected)  
3. **beforeRemember** → inject `## Memory context` from hybrid recall  
4. **afterThink** → capture agent output locally  
5. **onTaskComplete** → `syncPending` + outcome stub (ADR-005)

Optional live Walrus: set `MEMWAL_*` in `.env`, run `MEMWAL_AUTO_PUSH=1 pnpm agent:bounty-hunt`.

---

## Tech stack

| Layer | Stack |
|-------|--------|
| Durable memory | MemWal SDK, Walrus, Seal-oriented flows |
| Local memory | SQLite, quality scorers, agentmemory/memoirs adapters |
| Orchestration | OpenClaw / NemoClaw hooks (in-repo bridge + skills) |
| Chain | Sui Move, WAL demo coin, delegate bridge |
| App | Next.js dashboard, Turborepo, TypeScript |

---

## Why this deserves to win Walrus Track

1. **Walrus is not decorative** — every agent promotion path targets `walrusBlobId`; demos and code are aligned.
2. **Production-shaped hybrid** — local speed + durable truth with explicit conflict rules (durable wins on sealed content).
3. **Judge-friendly** — runs in **under 3 minutes without keys**; optional live blob ids in one env block.
4. **Full stack story** — agents + sync + Move marketplace/bounty, not a storage-only demo.
5. **Verifiable narrative** — PII redaction, quality gates, and on-chain outcome hooks (ADR-005) match Walrus “verifiable data” theme.

---

## Future work

- Indexer worker + Memory Kiosk UI wired to Move events  
- Live Move bounty PTBs in `agent:bounty-hunt` (stub today)  
- Seal PTB composition for policy-gated blob access  
- Published OpenClaw plugin (`memwalpp-oc-memwal`)

---

## On-chain package (Sui Mainnet)

| | |
|---|---|
| **Package ID** | `0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050` |
| **Explorer** | [Suiscan](https://suiscan.xyz/mainnet/object/0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050) |

---

## Verification

```bash
pnpm check && pnpm build && pnpm test
pnpm contracts:test    # Sui CLI
```

---

## AI-assisted development

Built with AI coding assistants (Cursor, Claude) per **ADR-012**. Architecture decisions: [`docs/decisions/`](docs/decisions/).

---

## Links

| Doc | Purpose |
|-----|---------|
| [`JUDGE_GUIDE.md`](JUDGE_GUIDE.md) | 5–10 min judge runbook |
| [`README.md`](README.md) | Full contributor docs |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System design + Walrus § |
| [`docs/diagrams/memwalpp-merged-architecture.svg`](docs/diagrams/memwalpp-merged-architecture.svg) | Architecture diagram |
