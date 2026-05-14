# OpenSpec — `@memwalpp/core`

**Phase:** 1 (Foundation)  
**Status:** Draft (business logic & cross-package orchestration)  
**ADR:** [ADR-013](../decisions/ADR-013.md)

---

## 1. Responsibility

- **Owns:** **Use-cases** that combine domain rules from **shared types** with **MemWal hook types** / outcome payloads (e.g. ADR-005 bridge), and future orchestration between local + durable memory **without** implementing storage drivers here.
- **Does not own:** Raw MemWal SDK calls (delegate to `@memwalpp/memwal-client`), SQL / vector stores (delegate to `@memwalpp/local-memory`), UI, Move compilation.

---

## 2. Public API (surface)

| Module / area | Purpose |
|---------------|---------|
| `memory/outcome-bridge` (existing) | Map local scoring inputs → `OnChainOutcomeEvent` shape for hooks / PTB batching |
| **Future (Phase 1+)** | `MemoryPromotionPolicy`, `BountyFulfillmentPipeline` — add only with matching tests / consumers |

Exports via **`packages/core/src/index.ts`** barrel only.

---

## 3. Dependencies

| Allowed | Forbidden |
|---------|-----------|
| `@memwalpp/shared` | `@memwalpp/local-memory` **until** a use-case is defined that needs it (then **one-way** `core` → `local-memory` only) |
| `@memwalpp/memwal-client` (types + facades for hook payloads) | Importing `apps/*` |
| | Circular: `memwal-client` **must not** import `core` |

**Rationale:** `memwal-client` stays a thin I/O boundary; `core` sits above it for “what we do with outcomes / memories” logic.

---

## 4. DAG note

Current graph: `shared` ← `memwal-client` ← (types only for hooks); `core` → `shared` + `memwal-client`. **No** `core` → `local-memory` yet — avoids premature coupling.

---

## 5. Success criteria

- `pnpm --filter @memwalpp/core check` green.
- No new dependency that pulls React or Next into `core`.
- Every exported function has a **single** clear layer (orchestration vs pure transform).

---

## 6. Related specs

- [`openspec-package-shared.md`](openspec-package-shared.md)
- [`openspec-package-local-memory.md`](openspec-package-local-memory.md)
- [`phase1-import-dag.md`](phase1-import-dag.md)
