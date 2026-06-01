import {
  moveTarget,
  walCoinType,
  type ObjectId,
} from "@memwalpp/shared";
import { Transaction } from "@mysten/sui/transactions";

import type { ChainClientConfig } from "./config.js";
import { chainUsesV2 } from "./config.js";
import { SUI_CLOCK_OBJECT_ID } from "./constants.js";
import { descriptionHashBytes, walrusBlobIdFromString } from "./hash.js";

function mintWalCoin(
  tx: Transaction,
  config: ChainClientConfig,
  amountMist: bigint,
) {
  const walType = walCoinType(config.packageId);
  return tx.moveCall({
    target: "0x2::coin::mint",
    typeArguments: [walType],
    arguments: [tx.object(config.walTreasuryCapId), tx.pure.u64(amountMist)],
  });
}

export { descriptionHashBytes, walrusBlobIdFromString } from "./hash.js";

export function buildPostBountyTx(
  config: ChainClientConfig,
  params: {
    amountMist: bigint;
    deadlineMs: bigint;
    description: string;
    minScore?: number;
  },
): Transaction {
  const tx = new Transaction();
  const hash = descriptionHashBytes(params.description);
  const payment = mintWalCoin(tx, config, params.amountMist);

  if (chainUsesV2(config)) {
    tx.moveCall({
      target: moveTarget("bounty_v2", "post_bounty_v2", config.packageId),
      arguments: [
        tx.object(config.configId!),
        payment,
        tx.pure.u64(params.deadlineMs),
        tx.pure.vector("u8", hash),
        tx.pure.u8(params.minScore ?? 50),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });
    return tx;
  }

  tx.moveCall({
    target: moveTarget("bounty", "post_bounty", config.packageId),
    arguments: [
      payment,
      tx.pure.u64(params.deadlineMs),
      tx.pure.vector("u8", hash),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });
  return tx;
}

export function buildSubmitFulfillmentTx(
  config: ChainClientConfig,
  params: { bountyId: ObjectId; walrusBlobId: string; packId?: ObjectId },
): Transaction {
  const tx = new Transaction();
  const blobObjectId = walrusBlobIdFromString(params.walrusBlobId);

  if (chainUsesV2(config)) {
    tx.moveCall({
      target: moveTarget("bounty_v2", "submit_fulfillment_v2", config.packageId),
      arguments: [
        tx.object(config.configId!),
        tx.object(params.bountyId),
        tx.pure.id(blobObjectId),
        params.packId
          ? tx.pure.option("id", params.packId)
          : tx.pure.option("id", null),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });
    return tx;
  }

  tx.moveCall({
    target: moveTarget("bounty", "submit_fulfillment", config.packageId),
    arguments: [
      tx.object(params.bountyId),
      tx.pure.id(blobObjectId),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });
  return tx;
}

export function buildListPackTx(
  config: ChainClientConfig,
  params: { packObjectId: ObjectId; priceMist: bigint },
): Transaction {
  const tx = new Transaction();

  if (chainUsesV2(config)) {
    tx.moveCall({
      target: moveTarget("marketplace_v2", "list_pack_v2", config.packageId),
      arguments: [
        tx.object(config.configId!),
        tx.object(config.marketplaceV2Id!),
        tx.object(params.packObjectId),
        tx.pure.u64(params.priceMist),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });
    return tx;
  }

  tx.moveCall({
    target: moveTarget("marketplace", "list_pack", config.packageId),
    arguments: [
      tx.object(config.marketplaceId),
      tx.object(params.packObjectId),
      tx.pure.u64(params.priceMist),
    ],
  });
  return tx;
}

export function buildBuyPackTx(
  config: ChainClientConfig,
  params: { packId: ObjectId; priceMist: bigint; sender: string; paymentCoin?: ObjectId },
): Transaction {
  const tx = new Transaction();
  const payment = params.paymentCoin
    ? tx.object(params.paymentCoin)
    : mintWalCoin(tx, config, params.priceMist);

  if (chainUsesV2(config)) {
    const bought = tx.moveCall({
      target: moveTarget("marketplace_v2", "buy_pack_v2", config.packageId),
      arguments: [
        tx.object(config.configId!),
        tx.object(config.marketplaceV2Id!),
        tx.pure.id(params.packId),
        payment,
      ],
    });
    tx.transferObjects([bought], params.sender);
    return tx;
  }

  const bought = tx.moveCall({
    target: moveTarget("marketplace", "buy_pack", config.packageId),
    arguments: [tx.object(config.marketplaceId), tx.pure.id(params.packId), payment],
  });
  tx.transferObjects([bought], params.sender);
  return tx;
}

export function buildForkPackTx(
  config: ChainClientConfig,
  params: {
    parentPackObjectId: ObjectId;
    newBlobIds: ObjectId[];
    contentHash: string;
    royaltyBps: number;
    sender: string;
  },
): Transaction {
  if (!chainUsesV2(config)) {
    throw new Error(
      "fork_pack requires v2 bootstrap (CONFIG_OBJECT_ID + MARKETPLACE_V2_OBJECT_ID)",
    );
  }
  const tx = new Transaction();
  const child = tx.moveCall({
    target: moveTarget("memory_ext", "fork_pack", config.packageId),
    arguments: [
      tx.object(params.parentPackObjectId),
      tx.pure.vector("id", params.newBlobIds),
      tx.pure.vector("u8", descriptionHashBytes(params.contentHash)),
      tx.pure.u16(params.royaltyBps),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });
  tx.transferObjects([child], params.sender);
  return tx;
}
