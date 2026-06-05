# @memwalpp/core

**Domain orchestration** for MemWal Agent Memory — hybrid local ↔ Walrus sync, agent hooks, and shared use-cases for CLI, MCP, and agent-swarm.

Depends inward only: `@memwalpp/shared`, `@memwalpp/local-memory`, `@memwalpp/memwal-client` (see [ADR-013](../../docs/decisions/ADR-013.md)).

## Main exports

| Module | Purpose |
|--------|---------|
| **`createMemorySyncService`** | Redact → quality gate → `pushOne` / `pullQuery` / `syncPending` — **Walrus critical path** |
| **`MemWalAgentBridge`** | Agent lifecycle: recall inject, capture, pack import (stub) |
| **`createMemWalSwarmHooks`** | `beforeRemember` / `afterThink` / `onTaskComplete` for swarm demos |
| **`SyncError`**, **`PushSkipReason`** | Explicit offline / gate / tombstone outcomes |

Entry: [`src/index.ts`](src/index.ts)

## Walrus path (judges)

```
LocalMemoryStore → MemorySyncService.pushOne → DurableMemoryStore → MemWal → Walrus
```

Skim: [`src/memory/memory-sync-service.ts`](src/memory/memory-sync-service.ts)

## Scripts

```bash
pnpm --filter @memwalpp/core check
pnpm --filter @memwalpp/core test
```

Tests: [`tests/`](tests/)

## Docs

- Architecture: [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md)
- OpenSpec: [`docs/specs/openspec-memory-sync-service.md`](../../docs/specs/openspec-memory-sync-service.md)
