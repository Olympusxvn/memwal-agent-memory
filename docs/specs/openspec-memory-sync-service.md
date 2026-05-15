# OpenSpec — `MemorySyncService` (Hybrid local ↔ MemWal sync)

**Change ID:** `memwal-sync-wave2`  
**Status:** Draft → Implementing  
**Package:** `@memwalpp/core`  
**Depends on:** `@memwalpp/local-memory`, `@memwalpp/memwal-client`, `@memwalpp/shared`  
**ADRs:** ADR-002 (no key logging), ADR-005 (local score non-authoritative), ADR-010 (durable wins on sealed conflict)

---

## 1. Problem

Agents need a **single orchestration API** that:

1. Reads/writes **local** memory first (fast).
2. **Redacts** before any durable push (ADR-010 / privacy).
3. Promotes only **quality-gated** rows to MemWal.
4. **Hydrates** local cache from durable recall when needed.
5. Resolves conflicts predictably for judges and demos.

---

## 2. Data flow

### 2.1 Local → durable (`pushOne`)

```
LocalMemoryStore.getById
  → skip if tombstone (metadata.deleted=1)
  → skip if metadata.allowUpstreamSync=0
  → redactForUpstream(content)          [local-memory]
  → scoreQuality(redacted) >= min      [local-memory]
  → build MemoryRecord (lineage metadata)
  → DurableMemoryStore.remember
  → LocalMemoryStore.remember (synced row)
```

**Invariant:** `redactForUpstream` is **always** invoked before `durable.remember`; never push raw local content when redaction changes text.

### 2.2 Durable → local (`pullQuery` / hydrate)

```
DurableMemoryStore.search(query)
  → merge hits → MemoryRecord[]        [core/merge]
  → LocalMemoryStore.remember (each)
  → optional LocalMemoryStore.recall (return to caller)
```

### 2.3 `syncPending` / `fullSync`

| Method | Behavior |
|--------|----------|
| `syncPending(ns?)` | `local.recall("", ns, limit)` → filter `!synced && !deleted` → `pushOne` each (sequential) |
| `fullSync(ns?)` | `syncPending` then `pullQuery("", { namespace: ns, forceDurable: true })` |

---

## 3. `MemorySyncService` API

```ts
export type ConflictStrategy = "durable_wins" | "local_wins" | "merge_metadata";

export interface MemorySyncConfig {
  qualityMin?: number;           // default 40
  defaultNamespace?: string;     // default "default"
  conflictStrategy?: ConflictStrategy; // default durable_wins
  waitForPush?: boolean;
}

export interface PushOneResult {
  recordId: string;
  pushed: boolean;
  reason?: "offline" | "tombstone" | "gate" | "allow_upstream_false" | "error";
  blobId?: string;
}

export interface SyncMetrics {
  pushed: number;
  skipped: number;
  failed: number;
  pulled: number;
}

export interface MemorySyncService {
  pushOne(recordId: string, opts?: { namespace?: string }): Promise<PushOneResult>;
  pullQuery(query: string, opts?: PullQueryOpts): Promise<MemoryRecord[]>;
  syncPending(opts?: { namespace?: string }): Promise<SyncMetrics>;
  fullSync(opts?: { namespace?: string }): Promise<SyncMetrics>;
  softDelete(recordId: string, opts?: { namespace?: string }): Promise<void>;
}
```

### Conflict resolution

| Strategy | When local & durable both have same `id` |
|----------|------------------------------------------|
| `durable_wins` (default) | Replace `content` from durable; keep `localQualityScore`; set `metadata.mergedFrom=durable` |
| `local_wins` | Skip durable overwrite of content |
| `merge_metadata` | Union metadata keys; durable content wins only if `synced` was already true |

Sealed rule (ADR-010): if local row has `synced: true` and `walrusBlobId` set, **content** updates from durable on pull; local-only scores never override chain truth.

---

## 4. Error recovery

| Error | Handling |
|-------|----------|
| `MemWalConfigError` / offline durable | `pushOne` returns `{ pushed: false, reason: "offline" }`; `pullQuery` returns local-only |
| Quality gate fail | `{ pushed: false, reason: "gate" }`; row stays unsynced |
| Transport after retries | `failed++` in metrics; **no** partial local `synced: true` without `blobId` |
| Redaction changed content | Always persist redacted text locally before push |

---

## 5. Background sync (optional)

`SyncQueue` (optional): in-memory FIFO of `recordId`; `enqueue` + `flush()`; **no** worker thread — caller or `setInterval` in app drives `flush`. Default: **disabled**; `MemorySyncService` stays synchronous.

---

## 6. Logging & metrics

- `SyncLogger` interface: `info`, `warn` (no `debug` of content — ADR-002).
- Counters returned in `SyncMetrics` per batch operation.
- Never log `MEMWAL_PRIVATE_KEY` or pre-redaction content.

---

## 7. Success criteria

- `core` depends on `local-memory` + `memwal-client` only (acyclic).
- Vitest: pushOne redacts + gates; pullQuery merges; durable_wins overwrites content.
- `pnpm run check` green.

---

## 8. Acceptance

| Check | PASS |
|-------|------|
| OpenSpec (this doc) | ✓ |
| `MemorySyncService` + merge + config | ✓ |
| Tests (5 Vitest) | ✓ |
| DAG (`core` → `local-memory`) | ✓ |
