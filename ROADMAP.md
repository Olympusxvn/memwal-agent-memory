# Roadmap — Memory Marketplace (MemWal++)

**Status:** Phases **0–4 complete** ✓ (Sui Overflow 2026 Walrus Track submission ready)

## Milestone + artifact (tóm tắt)

| Phase | Milestone | Status |
|-------|-----------|--------|
| **0** | Project setup | ✓ `PROJECT.md`, monorepo, CI, ADR-013, `.env.example` |
| **1** | Foundation packages | ✓ `shared`, `local-memory`, OpenSpecs, Vitest, acyclic DAG |
| **2** | MemWal integration | ✓ `DurableMemoryStore`, `MemorySyncService`, Phase 2 OpenSpecs |
| **3** | Sui Move contracts | ✓ Mainnet package, [`docs/deploy.md`](docs/deploy.md), `sui move test` |
| **4** | Autonomous agents + submission | ✓ `MemWalAgentBridge`, `agent:demo`, `SUBMISSION.md`, `JUDGE_GUIDE.md` |

**Thứ tự công cụ (Phase 1+):** OpenSpec → GSD → Implement → Review → Acceptance.

---

## Chi tiết theo phase (exit criteria)

| Phase | Exit criteria | Status |
|-------|----------------|--------|
| **0** | `PROJECT.md`, `ROADMAP.md`, `docs/ARCHITECTURE.md`, ADR-013, pnpm/turbo, CI, `.env.example` | ✓ |
| **1** | `shared` / `local-memory` specs; no `packages/*` cycles; `pnpm check` green | ✓ |
| **2** | MemWal facade + sync; `openspec-memwal-client.md` acceptance | ✓ |
| **3** | Move test + package ID in `deploy.md`, `SUBMISSION.md`, `pnpm contracts:info` | ✓ |
| **4** | Agent demos + hooks (ADR-005/010/011); judge path `pnpm agent:demo` | ✓ |

---

## Post-submission backlog

| Item | Notes |
|------|-------|
| Indexer worker | `docs/specs/indexer-schema.sql` |
| Dashboard PTBs | Wire `moveTarget()` + dApp Kit |
| Live bounty PTB in `agent:bounty-hunt` | Stub bounty today |
| Seal PTB | Compose with Mysten Seal package IDs |
| OpenClaw plugin publish | `apps/agent-swarm/plugin/` |

---

## Judge quick links

- [`JUDGE_GUIDE.md`](JUDGE_GUIDE.md)
- [`SUBMISSION.md`](SUBMISSION.md)
- [`docs/deploy.md`](docs/deploy.md)
