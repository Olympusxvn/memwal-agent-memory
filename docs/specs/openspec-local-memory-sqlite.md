# OpenSpec — Local memory (`LocalMemoryStore` + `SQLiteLocalStore`)

**Phase:** 1b (Local Memory Foundation)  
**Status:** Draft → Implemented  
**ADR:** [ADR-013](../decisions/ADR-013.md), ADR-010 (promotion gates), ADR-005 (scores not canonical in UI)

---

## 1. Goals

- **Durable local plane:** SQLite-backed store for `MemoryRecord` rows (namespace-scoped recall, id lookup).
- **Same contract as demos:** `remember` / `recall` / `prune` / `scoreQuality` / `redactForUpstream` with predictable behavior for agents and tests.
- **No new DAG edges:** `@memwalpp/local-memory` depends only on `@memwalpp/shared`; no `memwal-client` / `core`.

---

## 2. `LocalMemoryStore` (abstract contract)

**Location:** `packages/local-memory/src/store/LocalMemoryStore.ts`

| Method | Semantics |
|--------|-----------|
| `remember(record)` | Upsert by `record.id`; persists full `MemoryRecord` including `metadata` (JSON), `synced`, scores, optional `walrusBlobId`. |
| `recall({ namespace, query, limit })` | Rows where `namespace` matches; if `query` empty → all in namespace (newest first); else substring match on `content` (case-insensitive). `limit` capped internally (default max 500). |
| `getById(id)` | Single row or `undefined`. |
| `prune(params)` | Returns **count deleted**. Supports: `olderThanMs` (delete rows with `updatedAtMs` older), `keepLatest` (global cap — delete oldest rows until count ≤ keepLatest), optional `namespace` filter for both modes. Mutually combinable: apply `olderThanMs` first then `keepLatest` in one call (implementation order documented in code). |
| `scoreQuality(text)` | Default: heuristic **0–100** (non-authoritative); overridable in subclasses. |
| `redactForUpstream(text)` | Default: pipeline in `redact.ts`; overridable. |

**Threading:** SQLite connection is **single-thread** (`better-sqlite3`); callers must not invoke concurrent writes from multiple threads (Node default event loop: OK for sequential async).

---

## 3. `SQLiteLocalStore` implementation

**Location:** `packages/local-memory/src/store/sqlite/SQLiteLocalStore.ts`

- **Engine:** `better-sqlite3`; `PRAGMA journal_mode = WAL`; `foreign_keys = ON`.
- **Schema:** table `memory_records` with columns aligned to `MemoryRecord` + `metadata_json` TEXT.
- **Migrations:** version `1` initial DDL applied in constructor via `_schema_version` table (single row).
- **Errors:** operations throw `SqliteLocalStoreError` extends `LocalMemoryError` with `code` (`OPEN`, `SQL`, `CORRUPT_ROW`) — never swallow SQLite failures silently.

---

## 4. PII & secret stripping (`redactForUpstream`)

**Location:** `packages/local-memory/src/redact.ts`

| Class | Strategy |
|-------|-----------|
| Email | Regex replace → `[redacted-email]` |
| Phone | Formatted NANP (`555-123-4567`, `(555) 123-4567`) always redacted; bare 10–11 digit runs redacted **unless** inside a UUID, slug-id timestamp suffix (`sync-roundtrip-1739…`), or hex hash suffix (`blob-deadbeef…`) |
| High-entropy secrets | Lines matching `sk-[A-Za-z0-9]{20,}`, Bearer tokens, `BEGIN PRIVATE KEY`, hex runs ≥96 chars → redacted placeholders |
| Flags | Return `piiFlags` string array for logging/metrics (e.g. `email`, `phone`, `api_key_sk`) |

**Guarantees:** best-effort only — not GDPR-grade; document in UI copy for hackathon.

---

## 5. Quality scoring

- **`scoreSnippet`:** length-based fast path (existing).
- **`scoreQuality`:** default combines length + word count with hard cap 100; same ADR-005 disclaimer as `scoreSnippet`.

---

## 6. OSS adapters (in-repo, no npm coupling)

**agentmemory-style** / **memoirs-style:** pure mapper types + functions documenting field mapping to those ecosystems — **no** runtime dependency on external repos (per hackathon reproducibility).

---

## 7. Error types

| Type | When |
|------|------|
| `LocalMemoryError` | Base class for package |
| `SqliteLocalStoreError` | SQLite open, prepare, or row parse failures |

---

## 8. Success criteria

- `pnpm --filter @memwalpp/local-memory check` passes.
- `pnpm run check` monorepo green after adding `better-sqlite3`.
- CI runs `pnpm rebuild better-sqlite3` after install (native bindings).
- No imports from `@memwalpp/memwal-client` or `@memwalpp/core`.

---

## 9. Related

- [openspec-package-local-memory.md](openspec-package-local-memory.md)
- [phase1-import-dag.md](phase1-import-dag.md)
- Plan: [local-memory-sqlite-phase1b.md](../process/plans/local-memory-sqlite-phase1b.md)
