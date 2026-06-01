# `memwalpp_contracts` — Sui Move package

**MemWal++** (`memwal-agent-memory`) — on-chain memory marketplace, MemoryPack NFT, WAL bounties, and delegate/Seal hooks.

> **Naming:** display name **MemWal++**; repository `memwal-agent-memory`; Move package `memwalpp_contracts`; npm workspace `@memwalpp/*`. Mainnet package ID is **unchanged** for judge continuity.

## Quick reference

| | |
|---|---|
| **Package ID** | `0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050` |
| **UpgradeCap** | `0xada975edf109c28a8b74f3789312b90acef29aa7fa28a5e936dc489055e0fd66` |
| **Marketplace (shared)** | `0x7dea19c34022cc7d28d21bfef75859bd6704f8fbd9bc7ea00c787052f895d548` |
| **Deploy guide** | [`docs/deploy.md`](../../docs/deploy.md) |
| **OpenSpec (v1)** | [`docs/specs/openspec-move-contracts.md`](../../docs/specs/openspec-move-contracts.md) |
| **OpenSpec (v2 refactor)** | [`docs/specs/openspec-move-contracts-refactor.md`](../../docs/specs/openspec-move-contracts-refactor.md) |
| **Manifest** | [`deploy-manifest.json`](deploy-manifest.json) |
| **Live demo** | https://memwalpp-dashboard.vercel.app/ |

## Build & test

```bash
sui move build
sui move test
# or from repo root:
pnpm contracts:build
pnpm contracts:test
pnpm contracts:info
```

## Modules (v1 — mainnet)

| Module | Purpose |
|--------|---------|
| `wal` | Demo `WAL` coin (`TreasuryCap` at publish) |
| `memory_nft` | `MemoryPack` NFT + Walrus blob refs |
| `royalty` | 2.5% marketplace fee + royalty bps math |
| `marketplace` | List / buy packs (WAL) |
| `bounty` | WAL escrow + Walrus fulfillment id |
| `delegate_bridge` | Rotate `memwal_delegate` on pack |
| `access_policy` | Delegate-only Seal approval event |

## v2 refactor (repo complete — operator bootstrap pending)

Upgrade-in-place via existing **UpgradeCap** — no new package ID. Adds `memory_ext`, `bounty_v2`, `marketplace_v2`, `admin`, `events`, `constants`.

```bash
pnpm contracts:upgrade-v2          # sui client upgrade (operator)
pnpm contracts:bootstrap-v2 --discover
SUI_OPERATOR_PRIVATE_KEY=... pnpm contracts:bootstrap-v2 --write-manifest
```

See [`docs/deploy.md`](../../docs/deploy.md) § Move v2 and refactor OpenSpec.

## TypeScript

```ts
import { MARKETPLACE_PACKAGE_ID, moveTarget } from "@memwalpp/shared";

const target = moveTarget("bounty", "post_bounty");
// => "0x48db...::bounty::post_bounty"
```

Run `pnpm contracts:info` from repo root for deployed object IDs.

## Related

- [`PROJECT.md`](../../PROJECT.md) — vision & Walrus track alignment
- [`walrus.xyz-DESIGN.md`](../../walrus.xyz-DESIGN.md) — dashboard / slide design tokens
