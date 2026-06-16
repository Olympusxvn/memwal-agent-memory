# OpenSpec — `@memwalpp/local-memory` test coverage (Vitest)

**Phase:** 1c (Testing foundation)  
**Status:** Draft → Implemented  
**Related:** [`openspec-local-memory-sqlite.md`](openspec-local-memory-sqlite.md)

---

## 1. Goals

- **Regression safety** for `InMemoryLocalMemoryStore` and `SqliteLocalStore` (`:memory:`) on every PR.
- **Contract checks** for `remember` / `recall` / `getById` / `prune`, `redactForUpstream`, `scoreQuality`.
- **Edge-case documentation** via tests (PII, large payloads, validation errors, sequential “concurrent” writes).

---

## 2. Scope (must cover)

### 2.1 `InMemoryLocalMemoryStore`

| Area | Cases |
|------|--------|
| `remember` | Insert new; upsert same `id` replaces row; rejects empty `id` / empty `namespace` (`LocalMemoryError` `VALIDATION`) |
| `getById` | Hit / miss; empty id returns `undefined` |
| `recall` | Empty query returns all in namespace (newest first); substring match case-insensitive; `limit` clamped (min 1, max `LOCAL_MEMORY_RECALL_MAX`) |
| `prune` | `olderThanMs` deletes only matching rows; optional `namespace`; `keepLatest` trims oldest globally or per-namespace; combined order: olderThan first then cap |

### 2.2 `SqliteLocalStore` (`:memory:`)

| Area | Cases |
|------|--------|
| Persistence | Same behaviors as in-memory for remember/recall/getById/prune |
| Schema | Fresh DB creates `memory_records` + `_schema_version` |
| `close()` | Callable without throw after use |

### 2.3 `redactForUpstream` (module)

| Case | Expectation |
|------|-------------|
| Email | Replaced + `piiFlags` contains `email` |
| Formatted phone | `555-123-4567`, `(555) 123-4567` redacted + `phone` flag |
| Bare phone | Standalone `5551234567` redacted when not an id suffix |
| UUID marker | `e2e-sync-<uuid>` unchanged — no false `phone` flag |
| Timestamp suffix | `sync-roundtrip-<13-digit-ms>` unchanged |
| Hash suffix | `blob-<32+ hex>` unchanged |
| Bearer / sk- / PEM / long hex | At least one representative pattern produces redaction + flag (see implementation) |
| Clean text | No flags, unchanged |

### 2.4 `scoreQuality` / `scoreSnippet`

| Case | Expectation |
|------|-------------|
| Empty | `0` |
| Non-empty | Bounded `0–100`, deterministic for same input |

---

## 3. Out of scope (Phase 1c)

- **True multi-threaded** SQLite access (workers): Node Vitest default is single-threaded; document only.
- **Disk path** SQLite file locking / WAL on real FS: optional future job; `:memory:` sufficient for CI.
- **Fuzz / property-based** redaction: future.

---

## 4. Tooling

- **Runner:** Vitest (Node environment).
- **Optional UI:** `@vitest/ui` for local debugging (`vitest --ui`).
- **Commands:** `pnpm --filter @memwalpp/local-memory test` (watch), `vitest run` for CI; root may delegate via `turbo run test` / `pnpm test:local`.

---

## 5. CI / native module

- If `better-sqlite3` fails to load, run **`pnpm rebuild better-sqlite3`** before tests (see root CI workflow).
- **Dev machines without a successful native build:** Vitest still passes: contract tests run for `InMemoryLocalMemoryStore` always; **`SqliteLocalStore` tests are included only when** opening `:memory:` succeeds at startup (see `tests/store-contract.ts` probe). A **`sqlite-native-gate`** test prints a console warning when SQLite is skipped.

---

## 6. Success criteria

- `vitest run` in `packages/local-memory` exits **0** with all suites green.
- No new workspace dependencies violating ADR-013.
