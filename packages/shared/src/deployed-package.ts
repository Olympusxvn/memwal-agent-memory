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

export const MOVE_MODULES = [
  "wal",
  "memory_nft",
  "royalty",
  "marketplace",
  "bounty",
  "delegate_bridge",
  "access_policy",
] as const;

export type MoveModuleName = (typeof MOVE_MODULES)[number];

/** Build fully qualified Move call target for PTBs. */
export function moveTarget(
  module: MoveModuleName,
  functionName: string,
  packageId: ObjectId = MARKETPLACE_PACKAGE_ID,
): string {
  return `${packageId}::${module}::${functionName}`;
}

/** WAL coin type for this package (`0x2::coin::Coin<T>`). */
export function walCoinType(packageId: ObjectId = MARKETPLACE_PACKAGE_ID): string {
  return `${packageId}::wal::WAL`;
}
