# Judge guide — MemWal++ (5–10 minutes)

**Walrus Track · Sui Overflow 2026**

> **Start here.** No wallet, no MemWal keys, no Sui CLI required for the core path.

| Resource | Link |
|----------|------|
| Repository | https://github.com/Olympusxvn/memwalpp |
| Live demo (dashboard) | https://memwalpp-dashboard-86ydhjnmd-olympusxvns-projects.vercel.app/ |
| Submission brief | [`SUBMISSION.md`](SUBMISSION.md) |
| Architecture | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| Diagram | [`docs/diagrams/memwalpp-merged-architecture.svg`](docs/diagrams/memwalpp-merged-architecture.svg) |

---

## Scoring lens (Walrus track)

| # | Question | Where to verify |
|---|----------|-----------------|
| 1 | Is Walrus on the **critical path**? | `pushOne` → `walrusBlobId`; bounty `submit_fulfillment(blob_id)` |
| 2 | Can I run it **without setup pain**? | Commands below → exit 0 |
| 3 | Is integration **real code**? | `memory-sync-service.ts`, `MemWalAgentBridge.ts` |
| 4 | Is there **on-chain** story? | Mainnet package + [`docs/deploy.md`](docs/deploy.md) |

---

## Path A — Demos only (~3 min) ⭐ recommended

### Commands

```bash
git clone https://github.com/Olympusxvn/memwalpp.git
cd memwalpp
pnpm install
pnpm agent:demo
pnpm agent:bounty-hunt
```

### Expected: `pnpm agent:demo`

| Check | Expected |
|-------|----------|
| Exit code | `0` |
| Banner | `MemWal++ · agent:demo` |
| Steps | `[1/5]` … `[5/5]` in green |
| Context | Step 4 shows `## Memory context` injected |
| Offline | Step 3 may show `○ Not promoted (offline)` — **this is correct** |
| Footer | `── RESULT ──` table + `Status: PASS (exit 0)` |

### Expected: `pnpm agent:bounty-hunt`

| Check | Expected |
|-------|----------|
| Exit code | `0` |
| Agents | Poster (steps 2–3) + Hunter (steps 4–5) |
| Recall | Step 4: `Injected N chars from hybrid memory` (N > 0) |
| Footer | `Agents: poster + hunter` in RESULT block |

---

## Path B — Live Walrus blob id (~+2 min, optional)

1. Copy [`.env.example`](.env.example) → `.env`
2. Set **delegate** credentials only (ADR-002): `MEMWAL_PRIVATE_KEY`, `MEMWAL_ACCOUNT_ID`, `MEMWAL_SERVER_URL`
3. Run:

```bash
MEMWAL_AUTO_PUSH=1 pnpm agent:bounty-hunt
```

| Check | Expected |
|-------|----------|
| Poster step 3 | `✓ Promoted — blob 0x…` (or similar) |
| Durable line | `Durable: live` in step 1 banner |

---

## Path C — Code skim (~2 min)

| File | Why open it |
|------|-------------|
| [`packages/core/src/memory/memory-sync-service.ts`](packages/core/src/memory/memory-sync-service.ts) | Redact → gate → `durable.remember` |
| [`packages/core/src/agent/MemWalAgentBridge.ts`](packages/core/src/agent/MemWalAgentBridge.ts) | Agent hooks |
| [`packages/sui-contracts/sources/bounty.move`](packages/sui-contracts/sources/bounty.move) | WAL escrow + `walrus_blob_id` |
| [`apps/agent-swarm/src/swarm/demo.ts`](apps/agent-swarm/src/swarm/demo.ts) | Judge demo script |

---

## Path D — Contracts & CI (~+5 min, optional)

```bash
pnpm contracts:info     # package + marketplace IDs
pnpm contracts:test     # requires Sui CLI
pnpm check && pnpm test
```

| Item | Value |
|------|-------|
| Package ID | `0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050` |
| Marketplace | `0x7dea19c34022cc7d28d21bfef75859bd6704f8fbd9bc7ea00c787052f895d548` |
| Explorer | https://suiscan.xyz/mainnet/object/0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050 |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `pnpm: command not found` | Install pnpm 10 + Node 20+ |
| No colored output | Windows Terminal / modern terminal; demos still pass |
| `pushOne skipped (offline)` | Normal without `.env` — not a failure |
| SQLite vs in-memory | Both valid; banner shows `Store: sqlite` or `in-memory` |

---

## Why we built this (30 s)

Agents need **local speed** and **Walrus truth**. MemWal++ connects them with quality gates, PII redaction, runnable demos, and mainnet Move marketplace/bounty — see [`SUBMISSION.md`](SUBMISSION.md) §5.
