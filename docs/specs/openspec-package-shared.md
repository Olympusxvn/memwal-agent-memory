# OpenSpec — `@memwalpp/shared`

**Phase:** 1 (Foundation)  
**Status:** Draft (contract for types & pure helpers)  
**ADR:** [ADR-013 — Monorepo boundaries](../decisions/ADR-013.md)

---

## 1. Responsibility

- **Owns:** Cross-cutting **TypeScript types**, **branded string aliases** (Sui `ObjectId`, `SuiAddress`), **pure validators** (no I/O, no `fs`, no network).
- **Does not own:** Business workflows, MemWal, SQLite, Move ABIs, React.

---

## 2. Public API (surface)

| Area | Exports (conceptual) | Notes |
|------|----------------------|--------|
| Chain ids | `ObjectId`, `SuiAddress`, `isObjectId()` | Normalization rules in JSDoc |
| Memory domain | `MemoryNamespace`, `MemoryRecord`, `MemoryPackPreview`, **`MemorySpace`** (`id`, `namespace`, optional `label`, `allowUpstreamSync`, `operator`) | `MemoryRecord.localQualityScore` is **non-authoritative** for UI badges (ADR-005) |
| Bounty | `Bounty`, `BountyLifecycle`, `BountyPostedEvent` | Align with indexer / Move (ADR-008) |
| Marketplace rows | `MemoryPackListingRow`, `MemoryPackSaleRow`, `BountyRow` | Indexer-shaped DTOs |
| Agent | `AgentAction`, `AgentActionKind`, `AgentIdentity`, `AgentRole` | Logging / hooks / swarm |

**Barrel:** `packages/shared/src/index.ts` re-exports only stable public symbols — no deep imports required from consumers.

---

## 3. Dependencies

| Allowed | Forbidden |
|---------|-----------|
| `typescript` only (dev) | Any `@memwalpp/*` workspace package |
| | `@mysten/*`, `better-sqlite3`, `react`, `next` |

---

## 4. Success criteria

- `pnpm --filter @memwalpp/shared check` passes with **strict** TS.
- No runtime dependency other than TS types erased at compile time.
- Any new domain type used by **two** packages lives here first.

---

## 5. Related specs

- [`openspec-package-core.md`](openspec-package-core.md)
- [`openspec-package-local-memory.md`](openspec-package-local-memory.md)
- [`phase1-import-dag.md`](phase1-import-dag.md)
