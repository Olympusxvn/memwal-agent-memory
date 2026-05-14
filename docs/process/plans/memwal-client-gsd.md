# GSD — Plan: MemWal Client package

**Spec:** [`openspec-memwal-client.md`](openspec-memwal-client.md)

## Dependency graph

```
memwal-client
  ├── @memwalpp/shared (types only, existing)
  ├── @mysten-incubation/memwal (SDK)
  └── @mysten/sui@^2 (peer satisfaction for memwal)
```

## Sub-tasks (order)

1. **Deps** — Add `@mysten/sui@^2` to `memwal-client` (lockfile update). *Parallel-safe after spec.*
2. **`errors.ts`** — `MemWalConfigError` + `isMemWalConfigError()`.
3. **`config.ts`** — `loadMemWalConfigFromEnv`, `assertMemWalConfig`, `MemWalClientConfig` type (re-export / extend SDK config + wait flag).
4. **`service.ts`** — `MemWalService` interface, `LiveMemWalService`, `OfflineMemWalService`, `createMemWalService`, `tryCreateMemWalServiceFromEnv`.
5. **`index.ts`** — barrel exports; deprecate/remove `createMemWalStub` → `createMemWalStub` can alias `tryCreate...` for backward compat or remove - I'll keep stub as deprecated alias to Offline warning in JSDoc.
6. **`README.md`** (package) — env table + example.
7. **Monorepo** — Run `pnpm check`; fix any version conflicts.

## Risks

- **Dual @mysten/sui** (v1 in dashboard, v2 in memwal-client): pnpm isolates per package — acceptable until dashboard migrates.
- **Bundle size** for dashboard: if it never imports memwal-client on client edge-only, OK; if it does, tree-shake.

## DONE when

All acceptance rows in OpenSpec §5 checked after implementation.
