import type { ObjectId, SuiAddress } from "./sui.js";

export type BountyLifecycle =
  | "posted"
  | "fulfillment_submitted"
  | "paid"
  | "cancelled";

/** Mirrors on-chain bounty fields + indexer row (ADR-008). */
export interface Bounty {
  bountyId: ObjectId;
  poster: SuiAddress;
  amountMist: bigint;
  deadlineMs: bigint;
  /** Hex-encoded hash (e.g. 32-byte digest as `0x…`). */
  descriptionHash: string;
  fulfillmentBlobId?: ObjectId;
  claimer?: SuiAddress;
  lifecycle: BountyLifecycle;
  completed: boolean;
}

export interface BountyPostedEvent {
  bountyId: ObjectId;
  poster: SuiAddress;
  amountMist: bigint;
  deadlineMs: bigint;
  descriptionHash: string;
}
