import type { ObjectId } from "./sui.js";

/** Mainnet-published MemWal++ Move package (see packages/sui-contracts/deploy-manifest.json). */
export const MARKETPLACE_PACKAGE_ID =
  "0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050" as ObjectId;

/** Key objects from publish tx (mainnet v1). */
export const MAINNET_DEPLOYED_OBJECTS = {
  marketplace:
    "0x7dea19c34022cc7d28d21bfef75859bd6704f8fbd9bc7ea00c787052f895d548" as ObjectId,
  upgradeCap:
    "0xada975edf109c28a8b74f3789312b90acef29aa7fa28a5e936dc489055e0fd66" as ObjectId,
  walTreasuryCap:
    "0xb9ee4a8bab47624f8ec343fd079c51fb54be60a8671affc7961da6e45badc41e" as ObjectId,
} as const;

/**
 * v2 shared objects — populated after operator runs upgrade + bootstrap on mainnet.
 * Placeholders until bootstrap tx completes (S4 wiring).
 */
export const MAINNET_V2_OBJECTS = {
  config: "0x0" as ObjectId,
  marketplaceV2: "0x0" as ObjectId,
} as const;

export const MOVE_MODULES = [
  "wal",
  "memory_nft",
  "royalty",
  "marketplace",
  "bounty",
  "delegate_bridge",
  "access_policy",
  // v2 (additive upgrade)
  "constants",
  "events",
  "admin",
  "memory_ext",
  "marketplace_v2",
  "bounty_v2",
] as const;

export type MoveModuleName = (typeof MOVE_MODULES)[number];

/** v1-only modules (frozen published surface). */
export const MOVE_V1_MODULES = [
  "wal",
  "memory_nft",
  "royalty",
  "marketplace",
  "bounty",
  "delegate_bridge",
  "access_policy",
] as const;

export type MoveV1ModuleName = (typeof MOVE_V1_MODULES)[number];

/** v2 modules (new after upgrade-in-place). */
export const MOVE_V2_MODULES = [
  "constants",
  "events",
  "admin",
  "memory_ext",
  "marketplace_v2",
  "bounty_v2",
] as const;

export type MoveV2ModuleName = (typeof MOVE_V2_MODULES)[number];

/** Build fully qualified Move call target for PTBs. */
export function moveTarget(
  module: MoveModuleName,
  functionName: string,
  packageId: ObjectId = MARKETPLACE_PACKAGE_ID,
): string {
  return `${packageId}::${module}::${functionName}`;
}

/** Common v2 PTB entrypoints (package id unchanged after upgrade). */
export const MOVE_V2_TARGETS = {
  attachExt: moveTarget("memory_ext", "attach_ext"),
  bumpVersion: moveTarget("memory_ext", "bump_version"),
  forkPack: moveTarget("memory_ext", "fork_pack"),
  listPackV2: moveTarget("marketplace_v2", "list_pack_v2"),
  updatePriceV2: moveTarget("marketplace_v2", "update_price"),
  buyPackV2: moveTarget("marketplace_v2", "buy_pack_v2"),
  postBountyV2: moveTarget("bounty_v2", "post_bounty_v2"),
  submitFulfillmentV2: moveTarget("bounty_v2", "submit_fulfillment_v2"),
  reviewSubmission: moveTarget("bounty_v2", "review_submission"),
  fulfillBountyV2: moveTarget("bounty_v2", "fulfill_bounty_v2"),
  cancelAndRefundV2: moveTarget("bounty_v2", "cancel_and_refund_v2"),
  adminBootstrap: moveTarget("admin", "bootstrap"),
  marketplaceV2Bootstrap: moveTarget("marketplace_v2", "bootstrap"),
  setFeeBps: moveTarget("admin", "set_fee_bps"),
  setPaused: moveTarget("admin", "set_paused"),
} as const;

/** WAL coin type for this package (`0x2::coin::Coin<T>`). */
export function walCoinType(packageId: ObjectId = MARKETPLACE_PACKAGE_ID): string {
  return `${packageId}::wal::WAL`;
}
