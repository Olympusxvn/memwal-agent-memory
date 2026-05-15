# `@memwalpp/memwal-client`

Typed facade over [`@mysten-incubation/memwal`](https://www.npmjs.com/package/@mysten-incubation/memwal) for Memory Marketplace agents.

**Wave 1 (Phase 2):** `MemWalClient` + `DurableMemoryStore` (remember / recall / search / delete tombstone / listVersions).  
**Bidirectional sync** with local SQLite lives in **`@memwalpp/core`** (`MemorySyncService` — Wave 2).

## Environment

See repo root [`.env.example`](../../.env.example). Required for a **live** client:

- `MEMWAL_PRIVATE_KEY` — delegate key (ADR-002: never log)
- `MEMWAL_ACCOUNT_ID`
- `MEMWAL_SERVER_URL` — relayer URL

Optional: `MEMWAL_NAMESPACE`, `MEMWAL_WAIT_FOR_REMEMBER`, `MEMWAL_RETRY_MAX`, `MEMWAL_MIN_REQUEST_INTERVAL_MS`.

## API

```ts
import { MemWalClient } from "@memwalpp/memwal-client";

const client = MemWalClient.tryFromEnv();
if (client?.durable.isLive) {
  const record = { id: "r1", namespace: "default", content: "note", createdAtMs: Date.now(), updatedAtMs: Date.now(), synced: false };
  const pushed = await client.durable.remember(record);
  const hits = await client.durable.search("note", { limit: 5 });
  await client.destroy();
}
```

Low-level facade (no `MemoryRecord`):

```ts
import { tryCreateMemWalServiceFromEnv } from "@memwalpp/memwal-client";

const svc = tryCreateMemWalServiceFromEnv();
if (svc.isLive) {
  await svc.remember("text", { namespace: "my-ns" });
  const hits = await svc.recall("query", 10, "my-ns");
  svc.destroy();
}
```

**Redaction:** run `redactForUpstream` from `@memwalpp/local-memory` in **`core`** before `durable.remember` — not in this package.

## Specs

- [`docs/specs/openspec-durable-memory-store.md`](../../docs/specs/openspec-durable-memory-store.md) — Wave 1
- [`docs/specs/openspec-memwal-phase2-durable-sync.md`](../../docs/specs/openspec-memwal-phase2-durable-sync.md) — full Phase 2
- [`docs/specs/openspec-memwal-client.md`](../../docs/specs/openspec-memwal-client.md) — facade v1
