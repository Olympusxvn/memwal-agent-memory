# Cursor handoff — MemWal++ (`memwalpp`)

Last updated for session resume (local notes; safe to commit — **no private keys**).

## GitHub

- Remote intent: `https://github.com/Olympusxvn/memwalpp` (private). Initialize/push locally when ready.

## Mainnet deploy (smart contracts)

- **Package ID:** `0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050`
- **Suiscan (package):** https://suiscan.xyz/mainnet/object/0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050
- **Modules:** `wal`, `memory_nft`, `marketplace`, `royalty`, `delegate_bridge`, `access_policy`, `bounty`

### Quick semantics (don’t mis-pitch to judges)

- **`wal`:** In-package **demo `WAL` coin** (OTW + `TreasuryCap` at publish). Marketplace/bounty use **`Coin<WAL>` of this package** — not necessarily “the” ecosystem WAL token unless you bridge/swap later.
- **`delegate_bridge`:** Updates **`memwal_delegate` on `MemoryPack`** + `DelegateRotated` event. Does **not** call Mysten MemWal Move package; **real MemWal revoke/register** stays in **TS PTB** composition if/when wired.
- **`access_policy`:** **Gate + `SealAccessGranted` event** for delegate-only blob approval story; **no Seal package call inside Move** — Seal stays **PTB + app** with official Seal package IDs.
- **`marketplace` / `bounty`:** Escrow + fees + bounty lifecycle + events for indexer.

### Useful object IDs (from publish tx)

- **UpgradeCap:** `0xada975edf109c28a8b74f3789312b90acef29aa7fa28a5e936dc489055e0fd66` (keep for upgrades)
- **TreasuryCap (package WAL):** `0xb9ee4a8bab47624f8ec343fd079c51fb54be60a8671affc7961da6e45badc41e`
- **Shared `Marketplace`:** `0x7dea19c34022cc7d28d21bfef75859bd6704f8fbd9bc7ea00c787052f895d548`

## Env (when wiring UI)

Set when implementing (do not commit secrets):

- `NEXT_PUBLIC_MARKETPLACE_PACKAGE_ID=0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050`

## Path in workspace

- Repo root folder: **`memwalpp/`** (under `memwal++/`).
- Move sources: `packages/sui-contracts/sources/`
- Plan / ADRs: `docs/decisions/`, `docs/ARCHITECTURE.md`
