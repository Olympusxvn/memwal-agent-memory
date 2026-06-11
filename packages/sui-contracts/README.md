# `memwalpp_contracts` — Sui Move package

**MemWal++** (`memwal-agent-memory`) — on-chain memory marketplace, MemoryPack NFT, WAL bounties, and delegate/Seal hooks.

> **Naming:** display name **MemWal++**; repository `memwal-agent-memory`; Move package `memwalpp_contracts`; npm workspace `@memwalpp/*`. Mainnet package ID is **unchanged** for judge continuity.

## Quick reference

| | |
|---|---|
| **Package ID (original)** | `0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050` |
| **Published-at (PTB targets)** | `0x9de4c63e976b5244fc7a5378134c9a87030ef534491f8a6919698e7379a2b711` |
| **UpgradeCap** | `0xada975edf109c28a8b74f3789312b90acef29aa7fa28a5e936dc489055e0fd66` |
| **Marketplace (shared, v1)** | `0x7dea19c34022cc7d28d21bfef75859bd6704f8fbd9bc7ea00c787052f895d548` |
| **Config (v2 shared)** | `0x52ea5aa40b38de760c3faa08bd83cd047e4d63023091f14774a8a87609f0ecd1` |
| **Marketplace V2 (shared)** | `0xfaddc1f4fe0f82a84d885b47a1202e37dc8f0a87040a7df7ff3e4268566c488f` |
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

## v2 refactor (live on mainnet)

Upgraded **in-place** via the existing **UpgradeCap** — same original package ID, new published-at `0x9de4…`. Adds `memory_ext`, `bounty_v2`, `marketplace_v2`, `admin`, `events`, `constants`. Shared state was bootstrapped on mainnet **2026-06-01** (tx `BjV2Q8mCarkmtENT1T3SPncKAFP3qNHQKVJ2DgptUnkW`); the v2 object IDs above are canonical in [`@memwalpp/shared`](../shared/src/deployed-package.ts).

To reproduce on a fresh deployment (operators only):

```bash
pnpm contracts:upgrade-v2          # sui client upgrade (operator)
SUI_OPERATOR_PRIVATE_KEY=... pnpm contracts:bootstrap-v2 --write-manifest
```

See [`docs/deploy.md`](../../docs/deploy.md) § Move v2 and refactor OpenSpec.

## TypeScript

```ts
import { moveTarget } from "@memwalpp/shared";

// moveTarget defaults to the latest published-at id (correct for PTB calls).
const target = moveTarget("bounty", "post_bounty");
// => "0x9de4...::bounty::post_bounty"
```

> Use **published-at** (`0x9de4…`) for PTB `moveTarget` calls and the **original** id (`0x48db…`) for explorer links and the `wal::WAL` coin type. `walCoinType()` already pins the original id.

Run `pnpm contracts:info` from repo root for deployed object IDs.

## Related

- [`PROJECT.md`](../../PROJECT.md) — vision & Walrus track alignment
- [`walrus.xyz-DESIGN.md`](../../walrus.xyz-DESIGN.md) — dashboard / slide design tokens
