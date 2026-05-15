# OpenSpec — `DurableMemoryStore` & `MemWalClient` (Phase 2, Wave 1)

**Change ID:** `memwal-durable-wave1`  
**Status:** Draft → Implementing  
**Parent:** [`openspec-memwal-phase2-durable-sync.md`](openspec-memwal-phase2-durable-sync.md)  
**Sync (Wave 2):** `@memwalpp/core` only — **not** in this package.

---

## 1. Scope (Wave 1)

| In scope | Out of scope |
|----------|----------------|
| `DurableMemoryStore` + `MemWalClient` in `memwal-client` | `MemorySyncService`, `redactForUpstream` |
| Retry / transport errors | Local SQLite merge |
| `search` = semantic `recall` | Full Seal PTB client |
| `listVersions` from metadata + job status | Remote version API (none in SDK v0.0.3) |
| `delete` tombstone contract | Remote purge until SDK supports delete |

**Encryption:** Relayer path **SEAL-encrypts server-side** on `remember` (Mysten SDK). Wave 1 sends **already-redacted plaintext** from `core` in Wave 2; this package never logs pre-redaction content.

---

## 2. `DurableMemoryStore`

```ts
export interface MemoryVersion {
  version: string;       // metadata contentVersion or "1"
  blobId?: string;
  jobId?: string;
  promotedAtMs?: number;
  source: "durable" | "metadata";
}

export interface DurableRememberResult {
  recordId: string;
  jobId?: string;
  blobId?: string;
  namespace: string;
}

export interface DurableRecallHit {
  text: string;
  blobId?: string;
  distance?: number;
  metadata?: Record<string, string>;
}

export interface DurableMemoryStore {
  readonly isLive: boolean;

  remember(record: MemoryRecord, opts?: RememberOpts): Promise<DurableRememberResult>;
  recall(query: string, opts?: RecallOpts): Promise<DurableRecallHit[]>;
  search(query: string, opts?: RecallOpts): Promise<DurableRecallHit[]>;
  delete(recordId: string, opts?: NamespaceOpts): Promise<void>;
  listVersions(recordId: string, opts?: NamespaceOpts): Promise<MemoryVersion[]>;

  health(): Promise<{ ok: boolean; version?: string }>;
  destroy(): void;
}
```

### Behavior

| Method | Rules |
|--------|--------|
| `remember` | Non-empty `record.content`; uses `MemWalService.remember`; sets `blobId` when `wait` or config `waitForRemember` |
| `recall` / `search` | `search` delegates to `recall`; empty query → `RangeError` |
| `delete` | Sets tombstone in returned shape only; **no remote delete** in SDK v0.0.3 — callers mark local metadata `deleted=1` in Wave 2 |
| `listVersions` | Reads `metadata.contentVersion`, `lineageParentId`, `promotedAtMs`; if `metadata.lastJobId` set, optional status poll via service extension |
| `health` | Live: SDK `health()`; offline: `{ ok: false }` |

---

## 3. `MemWalClient`

Factory + holder for config, low-level `MemWalService`, and `DurableMemoryStore`.

```ts
export class MemWalClient {
  readonly config: MemWalClientConfig;
  readonly service: MemWalService;
  readonly durable: DurableMemoryStore;

  static create(config: MemWalClientConfig): MemWalClient;
  static tryFromEnv(env?: NodeJS.ProcessEnv): MemWalClient | null;

  destroy(): void;
}
```

Aliases: `privateKey` → config `key`, `relayerUrl` → `serverUrl`, `namespace` → config `namespace`.

---

## 4. Retry & errors

| Type | When |
|------|------|
| `MemWalConfigError` | Offline / missing config |
| `MemWalAuthError` | HTTP 401/403 |
| `MemWalTransportError` | Network, 5xx, timeout |
| `MemWalRateLimitError` | HTTP 429 |

**Retry policy (default):** max **3** attempts, base delay **500ms**, factor **2**, jitter **0.2**, cap **8s**. **No retry** on 4xx except 429 (retry with longer backoff).

**Rate limit:** optional `minRequestIntervalMs` (default **0**) between successful durable calls per client instance.

---

## 5. Config (env)

Existing `MEMWAL_*` plus:

| Variable | Purpose |
|----------|---------|
| `MEMWAL_RETRY_MAX` | Override max attempts |
| `MEMWAL_MIN_REQUEST_INTERVAL_MS` | Throttle between calls |

---

## 6. Success criteria

- `pnpm --filter @memwalpp/memwal-client check` green without env.
- Vitest: offline reject, retry mock, remember/recall mapping with mocked service.
- No import of `@memwalpp/local-memory`.

---

## 7. Acceptance

| Check | PASS |
|-------|------|
| OpenSpec (this doc) | ✓ |
| Implementation + exports | ✓ |
| Tests | ✓ |
| DAG unchanged (memwal-client → shared only) | ✓ |
