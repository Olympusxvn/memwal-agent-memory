# OpenSpec — `@memwalpp/local-memory`

**Phase:** 1 (Foundation)  
**Status:** Draft (local adapters + quality scoring)  
**ADR:** [ADR-013](../decisions/ADR-013.md)

---

## 1. Responsibility

- **Owns:** **Local-first** memory operations: SQLite (future), vector recall (future), **quality / length heuristics** before promotion to MemWal/Walrus (ADR-010).
- **Does not own:** MemWal relayer I/O, Move PTBs, dashboard components, **authoritative** marketplace scores (chain + indexer).

---

## 2. Public API (surface)

| Export | Contract |
|--------|----------|
| `LocalMemoryStore` | Abstract base: `remember`, `recall`, `getById`, `prune`, `scoreQuality`, `redactForUpstream` |
| `InMemoryLocalMemoryStore` | Reference implementation |
| `SqliteLocalStore` | SQLite + `better-sqlite3` (WAL, versioned schema) |
| `redactForUpstream` / `scoreQuality` | PII/secret heuristics + quality gate |
| Adapters | `agentmemory-adapter`, `memoirs-adapter` — pure mappers, no external npm |

Barrel: `packages/local-memory/src/index.ts`.

**Spec:** [`openspec-local-memory-sqlite.md`](openspec-local-memory-sqlite.md) · Tests: [`openspec-local-memory-tests.md`](openspec-local-memory-tests.md).

---

## 3. Dependencies

| Allowed | Forbidden |
|---------|-----------|
| `@memwalpp/shared` | `@memwalpp/core` (**breaks layering** if `core` later depends on `local-memory` — see below) |
| `better-sqlite3` | SQLite backend for `SqliteLocalStore` |
| | `@memwalpp/memwal-client` in v1 (keep local plane independent of network SDK) |
| | Importing `apps/*` |

**Layering rule:** `local-memory` is a **leaf** library (except `shared`). It **must not** import `core`. Orchestration that calls both `core` and `local-memory` lives in **`apps/agent-swarm`** or **`apps/cli`** (or later `core` importing `local-memory` only in that direction).

---

## 4. Success criteria

- `pnpm --filter @memwalpp/local-memory check` green.
- Scorers are **deterministic** for the same input (no hidden randomness) unless explicitly documented.
- Types for persisted rows come from **`shared`** (`MemoryRecord`, etc.).

---

## 5. Related specs

- [`openspec-package-shared.md`](openspec-package-shared.md)
- [`openspec-package-core.md`](openspec-package-core.md)
- [`phase1-import-dag.md`](phase1-import-dag.md)
