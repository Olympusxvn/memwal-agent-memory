import type { ObjectId, SuiAddress } from "./sui.js";

/** Single-namespace pack semantics (ADR-006). */
export type MemoryNamespace = string;

/** Options for local remember / MCP remember tool. */
export interface RememberOptions {
  /**
   * When true, apply server-side PII redaction before persisting to SQLite.
   * Default false — redaction runs on durable sync only (ADR-010).
   */
  redactLocal?: boolean;
  /** Hybrid sync: auto (score gate), local (never push), walrus (push when durable live). */
  promote?: "auto" | "local" | "walrus";
}

/** Well-known `MemoryRecord.metadata` keys (string values). */
export const MEMORY_METADATA_KEYS = {
  redactLocal: "redactLocal",
  redacted: "redacted",
  piiFlags: "piiFlags",
  contentVersion: "contentVersion",
  versionHistory: "versionHistory",
  syncedAtMs: "syncedAtMs",
  promotedAtMs: "promotedAtMs",
  lastJobId: "lastJobId",
  packId: "packId",
  bountyId: "bountyId",
  txDigest: "txDigest",
  fulfillmentTxDigest: "fulfillmentTxDigest",
  lineageParentId: "lineageParentId",
  lineageRootId: "lineageRootId",
  forkDepth: "forkDepth",
  lineageHistory: "lineageHistory",
  promoteMode: "promoteMode",
  accessCount: "accessCount",
  artifact: "artifact",
  artifactName: "artifactName",
  artifactMime: "artifactMime",
} as const;

/** Local or hydrated memory unit before/after sync to MemWal. */
export interface MemoryRecord {
  id: string;
  namespace: MemoryNamespace;
  /** Raw or redacted text; never persist PII upstream without redaction flag. */
  content: string;
  createdAtMs: number;
  updatedAtMs: number;
  /** Optional Walrus / MemWal blob reference after promotion. */
  walrusBlobId?: ObjectId;
  /** Quality score from local scorer — not authoritative for UI badges (ADR-005). */
  localQualityScore?: number;
  /** True once durable layer accepted the write. */
  synced: boolean;
  metadata?: Record<string, string>;
}

/** Pack-level aggregate for marketplace preview (ADR-004 metadata-only). */
export interface MemoryPackPreview {
  packId: ObjectId;
  namespace: MemoryNamespace;
  domainTags: string[];
  decisionCount: number;
  performanceScoreU8: number;
  excerpt?: string;
  creator: SuiAddress;
}

/**
 * Logical partition for multi-tenant / agent demos (not a chain object by itself).
 * Orchestration uses flags before calling MemWal or composing PTBs.
 */
export interface MemorySpace {
  id: string;
  namespace: MemoryNamespace;
  /** Display / logging only. */
  label?: string;
  /** When false, callers must not promote memories from this space to MemWal/Walrus. */
  allowUpstreamSync?: boolean;
  /** Optional operator address for UI (never a signing key). */
  operator?: SuiAddress;
}
