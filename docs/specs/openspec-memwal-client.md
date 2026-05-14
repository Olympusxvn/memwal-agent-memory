# OpenSpec — MemWal Client (`@memwalpp/memwal-client`)

**Change ID:** `memwal-client-v1`  
**Status:** Draft → Implemented  
**Owner:** MemWal++ / Sui Overflow 2026

---

## 1. Problem

The monorepo ships a **stub** `createMemWalStub()` while production flow requires a **typed, configurable wrapper** around Mysten’s **`@mysten-incubation/memwal`** SDK (delegate-key auth, relayer URL, namespace) so `apps/agent-swarm` and `packages/core` can call **remember / recall** without importing the raw SDK everywhere.

---

## 2. Requirements

### Functional

| ID | Requirement |
|----|-------------|
| R1 | Expose **`createMemWalService(config)`** that returns a small **facade** over `MemWal.create()` when `key` + `accountId` are valid. |
| R2 | Support **explicit config** (for tests / serverless) and **`loadMemWalConfigFromEnv()`** reading `MEMWAL_PRIVATE_KEY`, `MEMWAL_ACCOUNT_ID`, `MEMWAL_SERVER_URL`, optional default **namespace** (`MEMWAL_NAMESPACE` or fallback `default`). |
| R3 | Facade must implement **`remember(text, metadata?)`** — map metadata to optional **namespace** string; use **`rememberAndWait`** when caller needs terminal blob id (config flag `waitForRemember: boolean`, default `false` → `remember()` async accept). |
| R4 | Facade must implement **`recall(query, limit?)`** → `string[]` of plaintext snippets (aligned with `IMemWalAgent.queryMemory`). |
| R5 | **`destroy()`** must be callable to wipe SDK keys (delegate `MemWal.destroy()`). |
| R6 | **Offline / CI mode:** `tryCreateMemWalServiceFromEnv()` returns a **`MemWalService`** with `isLive: false` whose `remember` / `recall` **reject with `MemWalConfigError`**; `createMemWalService` **throws** if `key` / `accountId` missing — no network in `pnpm check`. |

### Non-functional

| ID | Requirement |
|----|-------------|
| N1 | **Strict TypeScript**; no `any`. |
| N2 | **ADR-002:** never log or stringify private keys. |
| N3 | Package may depend on **`@mysten-incubation/memwal`**; add **`@mysten/sui` v2** as direct dependency of this package to satisfy SDK peer range without forcing dashboard upgrade in this change. |
| N4 | Re-export selected SDK **types** (`MemWalConfig`, `RecallResult`) from package entry for consumers. |

---

## 3. Public API (TypeScript)

```ts
// config
export interface MemWalClientConfig {
  key: string | Uint8Array;
  accountId: string;
  serverUrl?: string;
  namespace?: string;
  /** When true, remember() waits for Walrus job (default false). */
  waitForRemember?: boolean;
}

export function loadMemWalConfigFromEnv(env?: NodeJS.ProcessEnv): MemWalClientConfig | null;
export class MemWalConfigError extends Error { ... }

// service
export interface MemWalService {
  remember(text: string, opts?: { namespace?: string; metadata?: Record<string, string> }): Promise<{ jobId?: string; blobId?: string }>;
  recall(query: string, limit?: number): Promise<string[]>;
  destroy(): void;
  /** True if backed by live SDK. */
  readonly isLive: boolean;
}

export function createMemWalService(config: MemWalClientConfig): MemWalService;
export function tryCreateMemWalServiceFromEnv(env?: NodeJS.ProcessEnv): MemWalService;
```

**Edge cases**

- Empty `text` on remember → throw `RangeError` or documented no-op (choose **throw** for consistency).
- `recall` with empty query → throw.
- `namespace` in metadata: only `metadata.namespace` key honored if string; other keys ignored for v1 (documented).

---

## 4. Success criteria

1. `pnpm --filter @memwalpp/memwal-client check` passes **without** MemWal env vars (offline throws on use, or we export only factory that returns live vs throws at `remember` — spec R6: throw on method call when config null — actually better: `tryCreateMemWalServiceFromEnv` returns service with `isLive: false` and methods throw `MemWalConfigError`).  
2. With valid env in integration test (optional future), `rememberAndWait` + `recall` succeed.  
3. `packages/core` / `agent-swarm` can import from `@memwalpp/memwal-client` without importing `@mysten-incubation/memwal` directly.

---

## 5. Acceptance (binary)

| Check | PASS |
|-------|------|
| Spec sections 2–4 implemented in code | ✓ |
| `pnpm run check` monorepo green | ✓ |
| No secrets in repo | ✓ |
| `EVENTS.md` / package README pointer updated | ✓ |
