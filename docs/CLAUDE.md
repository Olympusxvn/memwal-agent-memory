# CLAUDE.md — MemWal++

Context for **Claude / Cursor / other coding agents** working in this repo. Canonical architecture: [`ARCHITECTURE.md`](ARCHITECTURE.md). Monorepo rules: [`decisions/ADR-013.md`](decisions/ADR-013.md). Project intent: [`../PROJECT.md`](../PROJECT.md).

## Commands (root)

- `pnpm install` — install all workspaces
- `pnpm run check` — Turbo `check` (TypeScript) across packages/apps
- `pnpm run lint` — Turbo lint
- `pnpm run build` — Turbo build
- `pnpm contracts:build` / `pnpm contracts:test` — Move (`packages/sui-contracts`)
- `pnpm --filter dashboard dev` — Next.js dashboard
- `pnpm --filter agent-swarm dev` — agent app (if script exists in package)

## Hard constraints

- **Do not fork** Mysten MemWal; use **`@mysten-incubation/memwal`** only via **`@memwalpp/memwal-client`** (facade, hooks, env helpers).
- **Delegate signing only** (ADR-002); never commit owner keys or MemWal delegate secrets; `.env` is gitignored.
- **Scores in UI** must trace to **on-chain / indexed** evidence (ADR-005), not SQLite-only self-report.
- **Mainnet package IDs** for judge-facing demos when required (ADR-003).
- **Package DAG:** `packages/shared` imports no other workspace package; apps are never imported by `packages/*` (ADR-013).

## Layout (where things live)

| Area | Path |
|------|------|
| Move modules | `packages/sui-contracts/sources/*.move` |
| MemWal facade + hooks | `packages/memwal-client/src/` |
| Local SQLite / vectors | `packages/local-memory/` |
| Domain orchestration | `packages/core/` |
| Pure types | `packages/shared/` |
| Dashboard | `apps/dashboard/` |
| Agent swarm | `apps/agent-swarm/` |
| ADRs | `docs/decisions/ADR-NNN.md` |
| Feature specs (OpenSpec-style) | `docs/specs/*.md` |

## Native modules

- **`better-sqlite3`** (`@memwalpp/local-memory`): after `pnpm install`, run **`pnpm rebuild better-sqlite3`** if you see missing binding errors (pnpm v10 lifecycle defaults). CI runs this automatically.
- **Tests:** `pnpm test` — `vitest run` for `@memwalpp/local-memory`. `pnpm test:local` — Vitest watch (same package). When native SQLite is missing locally, contract tests still run on **InMemory**; see `docs/specs/openspec-local-memory-tests.md`.

## Before you ship a change

1. Run `pnpm run check` at repo root (and Move tests if you touched `packages/sui-contracts`).
2. If you changed boundaries between packages, update **ADR-013** or **`ARCHITECTURE.md`** in the same PR.
