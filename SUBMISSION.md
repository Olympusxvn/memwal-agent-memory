# MemWal++ — Sui Overflow 2026 · Walrus Track Submission

**Repository:** [github.com/Olympusxvn/memwalpp](https://github.com/Olympusxvn/memwalpp)  
**Track:** [Walrus](https://mystenlabs.notion.site/walrus-track-problem-statement) · **Event:** [Sui Overflow 2026](https://overflow.sui.io)

---

## Problem

Autonomous agents need **fast, private working memory** and **verifiable durable memory** that judges and marketplaces can trust. Plain chat logs are not proof; centralized DBs are not portable.

## Solution

**MemWal++** is a hybrid memory economy:

- **Local-first** layer (SQLite, quality scoring, PII redaction)
- **Durable** layer via **[MemWal](https://docs.memwal.ai)** → **Walrus** blobs (encrypted, recallable, verifiable)
- **Sui Move** for MemoryPack NFTs, marketplace, bounties, royalties, delegate bridge

---

## Features (implemented)

| Area | What judges can verify |
|------|------------------------|
| **Hybrid sync** | `MemorySyncService` — local → `redactForUpstream` → quality gate → MemWal |
| **Agent hooks** | `MemWalAgentBridge` — `beforeRemember`, `afterThink`, `onTaskComplete` (ADR-011) |
| **Demos** | `pnpm agent:demo`, `pnpm agent:bounty-hunt` (offline-safe) |
| **Move contracts** | `memory_nft`, `marketplace`, `bounty`, `royalty`, `wal`, `delegate_bridge`, `access_policy` |
| **Monorepo** | Turborepo + pnpm, CI, ADRs, OpenSpecs |

---

## How to run (judge path — ~5 min)

**Requirements:** Node.js 20+, pnpm 10

```bash
git clone https://github.com/Olympusxvn/memwalpp.git
cd memwalpp
pnpm install
pnpm agent:demo
pnpm agent:bounty-hunt
```

Optional — live Walrus promotion via MemWal:

```bash
cp .env.example .env
# Set MEMWAL_PRIVATE_KEY, MEMWAL_ACCOUNT_ID, MEMWAL_SERVER_URL (delegate key only)
export MEMWAL_AUTO_PUSH=1
pnpm agent:bounty-hunt
```

Full verification:

```bash
pnpm contracts:build
pnpm contracts:test
pnpm check
pnpm build
pnpm --filter @memwalpp/core test
```

---

## Walrus integration points

| Step | Code / command |
|------|----------------|
| Remember to Walrus | `DurableMemoryStore.remember` → `@mysten-incubation/memwal` → relayer |
| Blob reference | `MemoryRecord.walrusBlobId` after `pushOne` / sync |
| Agent promotion | `MemorySyncService.pushOne` in `@memwalpp/core` |
| Demo proof path | `pnpm agent:demo` step 3 — prints blob id when `MEMWAL_*` configured |
| Architecture | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) § Walrus Track |

MemWal handles **encryption on the relayer**; this repo enforces **redaction before push** in `core` (never upstream raw PII).

---

## On-chain package (Sui Mainnet)

| Field | Value |
|-------|--------|
| **Package ID** | `0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050` |
| **Explorer** | [Suiscan](https://suiscan.xyz/mainnet/object/0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050) |

---

## AI-assisted development

This project used AI coding assistants (Cursor, Claude) per **ADR-012**. All architecture decisions are documented in [`docs/decisions/`](docs/decisions/).

---

## Links

- [README.md](README.md) — full quick start
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system design
- [docs/diagrams/memwalpp-merged-architecture.svg](docs/diagrams/memwalpp-merged-architecture.svg) — diagram
