# `@memwalpp/memwal-client`

Typed facade over [`@mysten-incubation/memwal`](https://www.npmjs.com/package/@mysten-incubation/memwal) for Memory Marketplace agents (remember / recall, offline-safe CI).

## Environment

See repo root [`.env.example`](../../.env.example). Required for a **live** service:

- `MEMWAL_PRIVATE_KEY` — delegate key (ADR-002: never log)
- `MEMWAL_ACCOUNT_ID`
- `MEMWAL_SERVER_URL` — relayer URL (optional in loader; example uses local)

Optional:

- `MEMWAL_NAMESPACE` — Walrus namespace (defaults to `"default"` when unset in `loadMemWalConfigFromEnv`)
- `MEMWAL_WAIT_FOR_REMEMBER` — `true` / `1` / `yes` to use `rememberAndWait`

## API

```ts
import {
  createMemWalService,
  tryCreateMemWalServiceFromEnv,
  loadMemWalConfigFromEnv,
} from "@memwalpp/memwal-client";

const fromEnv = tryCreateMemWalServiceFromEnv();
if (fromEnv.isLive) {
  await fromEnv.remember("note", { namespace: "my-ns" });
  const hits = await fromEnv.recall("note", 5);
  fromEnv.destroy();
}

const cfg = loadMemWalConfigFromEnv();
if (cfg) {
  const live = createMemWalService(cfg);
  // ...
}
```

When env is incomplete, `tryCreateMemWalServiceFromEnv()` returns an offline service: `remember` / `recall` reject with `MemWalConfigError` (safe for `pnpm check` without keys).

## Spec

[`docs/specs/openspec-memwal-client.md`](../../docs/specs/openspec-memwal-client.md)
