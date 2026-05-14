import type { ObjectId, SuiAddress } from "./sui.js";

export interface MemoryPackListingRow {
  packId: ObjectId;
  seller: SuiAddress;
  priceMist: bigint;
  txDigest: string;
}

export interface MemoryPackSaleRow {
  packId: ObjectId;
  buyer: SuiAddress;
  seller: SuiAddress;
  priceMist: bigint;
  marketplaceFeeMist: bigint;
  royaltyMist: bigint;
}

export interface BountyRow {
  bountyId: ObjectId;
  poster: SuiAddress;
  amountMist: bigint;
  deadlineMs: bigint;
}
