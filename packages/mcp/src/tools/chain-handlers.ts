import type { ChainClient } from "@memwalpp/memwal-client";
import { DEFAULT_BOUNTY_AMOUNT_MIST } from "@memwalpp/memwal-client";
import type { ObjectId } from "@memwalpp/shared";

import type { ToolRuntime } from "./handlers.js";

export interface ChainToolRuntime extends ToolRuntime {
  chain: ChainClient | null;
}

function chainUnavailable(): Record<string, unknown> {
  return {
    skipReason: "chain_not_configured",
    message:
      "Set SUI_DELEGATE_PRIVATE_KEY (or MEMWAL_PRIVATE_KEY), MARKETPLACE_OBJECT_ID, and WAL_TREASURY_CAP_ID to enable on-chain tools.",
  };
}

export async function handleCreateBounty(
  rt: ChainToolRuntime,
  args: {
    description: string;
    amountMist?: string;
    deadlineHours?: number;
    minScore?: number;
  },
): Promise<Record<string, unknown>> {
  if (!rt.chain) return chainUnavailable();
  const amountMist = args.amountMist
    ? BigInt(args.amountMist)
    : DEFAULT_BOUNTY_AMOUNT_MIST;
  const hours = args.deadlineHours ?? 24;
  const deadlineMs = BigInt(Date.now() + hours * 3_600_000);
  const result = await rt.chain.postBounty({
    amountMist,
    deadlineMs,
    description: args.description,
    minScore: args.minScore,
  });
  return {
    txDigest: result.txDigest,
    amountMist: amountMist.toString(),
    deadlineMs: deadlineMs.toString(),
    usesV2: Boolean(rt.chain.config.configId && rt.chain.config.marketplaceV2Id),
  };
}

export async function handleFulfillBounty(
  rt: ChainToolRuntime,
  args: { bountyId: string; recordId: string; namespace?: string },
): Promise<Record<string, unknown>> {
  if (!rt.chain) return chainUnavailable();
  const push = await rt.sync.pushOne(args.recordId, {
    namespace: args.namespace ?? rt.config.defaultNamespace,
  });
  if (!push.pushed || !push.blobId) {
    return {
      bountyId: args.bountyId,
      promoted: false,
      skipReason: push.reason ?? "gate",
    };
  }
  const result = await rt.chain.submitFulfillment({
    bountyId: args.bountyId as ObjectId,
    walrusBlobId: push.blobId,
  });
  return {
    bountyId: args.bountyId,
    recordId: args.recordId,
    walrusBlobId: push.blobId,
    txDigest: result.txDigest,
  };
}

export async function handleListMemoryPack(
  rt: ChainToolRuntime,
  args: { packObjectId: string; priceMist: string },
): Promise<Record<string, unknown>> {
  if (!rt.chain) return chainUnavailable();
  const result = await rt.chain.listMemoryPack({
    packObjectId: args.packObjectId as ObjectId,
    priceMist: BigInt(args.priceMist),
  });
  return { packObjectId: args.packObjectId, priceMist: args.priceMist, txDigest: result.txDigest };
}

export async function handleBuyMemoryPack(
  rt: ChainToolRuntime,
  args: { packId: string; priceMist: string },
): Promise<Record<string, unknown>> {
  if (!rt.chain) return chainUnavailable();
  const result = await rt.chain.buyMemoryPack({
    packId: args.packId as ObjectId,
    priceMist: BigInt(args.priceMist),
  });
  return { packId: args.packId, txDigest: result.txDigest };
}

export async function handleForkMemory(
  rt: ChainToolRuntime,
  args: {
    parentPackObjectId: string;
    recordId: string;
    newBlobIds?: string[];
    royaltyBps?: number;
    namespace?: string;
  },
): Promise<Record<string, unknown>> {
  if (!rt.chain) return chainUnavailable();
  const push = await rt.sync.pushOne(args.recordId, {
    namespace: args.namespace ?? rt.config.defaultNamespace,
  });
  if (!push.pushed) {
    return { recordId: args.recordId, forked: false, skipReason: push.reason ?? "gate" };
  }
  const row = await rt.local.getById(args.recordId);
  const contentHash = row?.content ?? push.recordId;
  const blobIds = (args.newBlobIds?.length ? args.newBlobIds : push.blobId ? [push.blobId] : []) as ObjectId[];
  if (blobIds.length === 0) {
    return { forked: false, skipReason: "no_blob_id", recordId: args.recordId };
  }
  try {
    const result = await rt.chain.forkMemory({
      parentPackObjectId: args.parentPackObjectId as ObjectId,
      newBlobIds: blobIds,
      contentHash,
      royaltyBps: args.royaltyBps,
    });
    return {
      forked: true,
      recordId: args.recordId,
      walrusBlobId: push.blobId,
      txDigest: result.txDigest,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { forked: false, skipReason: "chain_error", message };
  }
}
