# GSD plan — Phase 1b SQLite local store

## Dependency order (sub-tasks)

1. **Errors** — `LocalMemoryError`, `SqliteLocalStoreError` (`src/errors.ts`).
2. **Redact v2** — expand `redact.ts` per OpenSpec (phone, secrets); keep pure functions.
3. **Quality** — extend `quality-scorer.ts` with `scoreQuality` (default heuristic).
4. **Abstract store** — `store/LocalMemoryStore.ts` (abstract class + `RecallParams`, `PruneParams`).
5. **In-memory** — migrate to `store/in-memory-store.ts` extending abstract class (parity tests manual / future vitest).
6. **SQLite** — `store/sqlite/SQLiteLocalStore.ts` (DDL + migrations + CRUD + prune; no separate `schema.ts`).
7. **Adapters** — `adapters/agentmemory-adapter.ts`, `adapters/memoirs-adapter.ts` (pure mappers).
8. **Barrel** — `src/index.ts` re-exports; remove obsolete `src/store.ts`.
9. **Deps** — `better-sqlite3` + `@types/better-sqlite3` on `@memwalpp/local-memory`.
10. **Docs** — link OpenSpec from `openspec-package-local-memory.md`; run `pnpm run check`.

## CI / install

- Root **`.github/workflows/ci.yml`**: `pnpm rebuild better-sqlite3` after `pnpm install`.
- **`pnpm-workspace.yaml`**: `onlyBuiltDependencies: [better-sqlite3]` (pnpm v10 lifecycle policy).

## Status

**Completed** — abstract `LocalMemoryStore`, `SqliteLocalStore`, adapters, expanded redact/quality.

## Risks

- **Native module:** CI must compile `better-sqlite3` (Ubuntu + `pnpm install` — standard).
- **Windows dev:** requires build tools if prebuild missing; document in OpenSpec if hit.

## Done when

- OpenSpec + this plan merged; abstract + SQLite + in-memory green under `pnpm run check`.
