import type { ObjectId } from "@memwalpp/shared";

export interface OnChainVerifyInput {
  walrusBlobId?: string;
  packId?: string;
  bountyId?: string;
  txDigest?: string;
}

export interface OnChainVerifyResult {
  checked: boolean;
  live: boolean;
  network?: string;
  packContainsBlob?: boolean;
  bountyReferencesBlob?: boolean;
  txFound?: boolean;
  txSuccess?: boolean;
  reasons: string[];
  refs?: Record<string, string>;
}

export interface ChainReaderConfig {
  network: import("./config.js").SuiNetwork;
}

export interface PackLineageResult {
  checked: boolean;
  live: boolean;
  packId?: string;
  parentPackId?: string;
  rootPackId?: string;
  forkDepth?: number;
  ancestors?: string[];
  version?: number;
  reasons: string[];
}

export interface ChainReader {
  readonly isLive: boolean;
  readonly network: ChainReaderConfig["network"];
  verifyMemoryRefs(input: OnChainVerifyInput): Promise<OnChainVerifyResult>;
  readPackLineage(packId: string): Promise<PackLineageResult>;
}

export function offlineOnChainResult(reason: string): OnChainVerifyResult {
  return { checked: false, live: false, reasons: [reason] };
}
