# Deploy & interact — `memwalpp_contracts` (Sui Mainnet)

**Package ID:** `0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050`  
**Explorer:** [Suiscan package](https://suiscan.xyz/mainnet/object/0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050)

Machine-readable manifest: [`packages/sui-contracts/deploy-manifest.json`](../packages/sui-contracts/deploy-manifest.json)

---

## Published objects (mainnet v1)

| Object | ID | Role |
|--------|-----|------|
| **Package** | `0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050` | All module bytecode |
| **Marketplace** (shared) | `0x7dea19c34022cc7d28d21bfef75859bd6704f8fbd9bc7ea00c787052f895d548` | `list_pack` / `buy_pack` |
| **UpgradeCap** | `0xada975edf109c28a8b74f3789312b90acef29aa7fa28a5e936dc489055e0fd66` | Package upgrades (operator only) |
| **WAL TreasuryCap** | `0xb9ee4a8bab47624f8ec343fd079c51fb54be60a8671affc7961da6e45badc41e` | Mint demo `WAL` for tests |

---

## Environment variables

Copy [`.env.example`](../.env.example):

```bash
MARKETPLACE_PACKAGE_ID=0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050
NEXT_PUBLIC_MARKETPLACE_PACKAGE_ID=0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050
MARKETPLACE_OBJECT_ID=0x7dea19c34022cc7d28d21bfef75859bd6704f8fbd9bc7ea00c787052f895d548
WAL_TREASURY_CAP_ID=0xb9ee4a8bab47624f8ec343fd079c51fb54be60a8671affc7961da6e45badc41e
SUI_DELEGATE_PRIVATE_KEY=   # MCP / agent-swarm chain PTBs (delegate only)
SUI_NETWORK=mainnet
# v2 objects — fill after upgrade + bootstrap (see below)
CONFIG_OBJECT_ID=0x0
MARKETPLACE_V2_OBJECT_ID=0x0
```

Never commit private keys. Use **delegate** keys for MemWal only (ADR-002).

---

## Build & test (local)

```bash
cd packages/sui-contracts
sui move build
sui move test
```

From repo root:

```bash
pnpm contracts:build
pnpm contracts:test
pnpm contracts:info    # print package + object IDs
```

---

## Module capabilities

| Module | Key functions | WAL / Walrus |
|--------|---------------|--------------|
| `wal` | `init` (publish) | Mints package `WAL` |
| `memory_nft` | `mint_pack`, `burn_pack` | Stores `blob_ids` (Walrus) |
| `marketplace` | `list_pack`, `buy_pack`, `cancel_listing` | Pays in `Coin<WAL>` |
| `bounty` | `post_bounty`, `submit_fulfillment`, `approve_fulfillment`, `cancel_and_refund` | Escrow + `walrus_blob_id` |
| `delegate_bridge` | `rotate_memwal_delegate` | Links pack → MemWal delegate |
| `access_policy` | `seal_approve_for_blob` | Audit event for Seal PTB |
| `royalty` | `take_fee`, `take_royalty` | Pure math (2.5% fee) |

Full event list: [`docs/specs/openspec-move-contracts.md`](specs/openspec-move-contracts.md).

---

## TypeScript PTB targets

```ts
import {
  MARKETPLACE_PACKAGE_ID,
  MAINNET_DEPLOYED_OBJECTS,
  moveTarget,
} from "@memwalpp/shared";

// Example: bounty::post_bounty
const target = moveTarget("bounty", "post_bounty");
// => "0x48db...::bounty::post_bounty"

const marketId = MAINNET_DEPLOYED_OBJECTS.marketplace;
```

Compose with `@mysten/sui` `Transaction` in `apps/dashboard` or via `@memwalpp/memwal-client` chain helpers:

```ts
import { tryCreateChainClientFromEnv, buildPostBountyTx } from "@memwalpp/memwal-client";

const chain = tryCreateChainClientFromEnv();
if (chain) {
  const tx = buildPostBountyTx(chain.config, { amountMist: 1_000_000n, description: "…" });
  await chain.signAndExecute(tx);
}
```

---

## Typical flows

### 1. Mint MemoryPack

1. `memory_nft::mint_pack(namespace, blob_ids, …)`  
2. Transfer pack to owner (or list on marketplace).

### 2. List on marketplace

1. `marketplace::list_pack(&mut market, pack, price_mist, ctx)`  
2. Indexer sees `PackListed`.

### 3. Post bounty (WAL escrow)

1. Mint/ obtain package `WAL` via `TreasuryCap` (demo).  
2. `bounty::post_bounty(coin, deadline_ms, description_hash, clock, ctx)`  
3. Hunter `submit_fulfillment(bounty, walrus_blob_id, …)` — **Walrus proof id**.  
4. Poster `approve_fulfillment`.

### 4. Hybrid memory + chain

1. Agent `pushOne` → MemWal → Walrus blob id.  
2. `submit_fulfillment` with same blob id as `ID`.  
3. `toOutcomeEvent` in TS (ADR-005) for indexer correlation.

---

## Upgrade & republish

- **UpgradeCap** id in manifest — use `sui client upgrade` with same `Published.toml` workflow.  
- Bump `version` in `Published.toml` after upgrade.  
- Update `deploy-manifest.json` if shared objects change (Marketplace id is stable from first publish).

### Move v2 (S4 operator steps)

After pulling v2 modules into the repo:

1. **Upgrade bytecode** (package id unchanged):
   ```bash
   pnpm contracts:upgrade-v2
   # or: ./scripts/upgrade-contracts-v2.sh
   ```
2. **Discover bootstrap registry** (shared object created by `admin::init` on upgrade):
   ```bash
   pnpm contracts:bootstrap-v2 --discover --upgrade-digest=<upgrade-tx-digest>
   # or set BOOTSTRAP_REGISTRY_ID=0x... after reading Suiscan object changes
   ```
3. **Bootstrap shared objects** (one-time PTB from operator wallet):
   ```bash
   SUI_OPERATOR_PRIVATE_KEY=... pnpm contracts:bootstrap-v2 --write-manifest
   ```
   Creates shared `Config` + `MarketplaceV2`; transfers `AdminCap` to operator.
4. **Record object ids** in `.env`, `deploy-manifest.json`, and `@memwalpp/shared` `MAINNET_V2_OBJECTS`.
5. Re-run `pnpm contracts:info` — v2 targets activate when `CONFIG_OBJECT_ID` and `MARKETPLACE_V2_OBJECT_ID` are non-zero.

Until bootstrap, MCP, agent-swarm, and dashboard use **v1** PTB targets (`bounty::post_bounty`, `marketplace::list_pack`, …).

**Dry-run PTB (no gas):**
```bash
pnpm contracts:bootstrap-v2 --dry-run --registry 0xYOUR_REGISTRY_ID
```

---

## WAL disclaimer

This deployment mints a **package-local `WAL` coin** for demo economics. It is **not** automatically the ecosystem WAL token — bridge or document swap before production.

---

## Related docs

- [`docs/specs/openspec-move-contracts.md`](specs/openspec-move-contracts.md)  
- [`docs/decisions/ADR-008.md`](decisions/ADR-008.md) — bounty  
- [`docs/CURSOR-HANDOFF.md`](CURSOR-HANDOFF.md) — operator notes  
