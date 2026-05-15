# `memwalpp_contracts` — Sui Move package

Mainnet package for MemWal++ marketplace, MemoryPack NFT, WAL bounties, and delegate/Seal hooks.

## Quick reference

| | |
|---|---|
| **Package ID** | `0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050` |
| **Deploy guide** | [`docs/deploy.md`](../../docs/deploy.md) |
| **OpenSpec** | [`docs/specs/openspec-move-contracts.md`](../../docs/specs/openspec-move-contracts.md) |
| **Manifest** | [`deploy-manifest.json`](deploy-manifest.json) |

## Build & test

```bash
sui move build
sui move test
# or from repo root:
pnpm contracts:build
pnpm contracts:test
```

## Modules

| Module | Purpose |
|--------|---------|
| `wal` | Demo `WAL` coin (`TreasuryCap` at publish) |
| `memory_nft` | `MemoryPack` NFT + Walrus blob refs |
| `royalty` | 2.5% marketplace fee + royalty bps math |
| `marketplace` | List / buy packs (WAL) |
| `bounty` | WAL escrow + Walrus fulfillment id |
| `delegate_bridge` | Rotate `memwal_delegate` on pack |
| `access_policy` | Delegate-only Seal approval event |

## TypeScript

```ts
import { MARKETPLACE_PACKAGE_ID, moveTarget } from "@memwalpp/shared";

const target = moveTarget("bounty", "post_bounty");
```

Run `pnpm contracts:info` from repo root for deployed object IDs.
