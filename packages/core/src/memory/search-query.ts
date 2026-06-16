import type { MemoryRecord } from "@memwalpp/shared";

export interface SearchQueryOpts {
  namespace?: string;
  limit?: number;
  /** When true, always query Walrus even if local hits fill the limit. */
  forceDurable?: boolean;
  /** Minimum scoreSemanticMatch to include (default 0.05). */
  minScore?: number;
}

export type SearchHitSource = "local" | "durable" | "hybrid";

export interface SearchHit {
  record: MemoryRecord;
  /** Relevance score in [0, 1]. */
  score: number;
  /** `hybrid` = synced to Walrus with blob id (verifiable path complete). */
  source: SearchHitSource;
  /** True when memory completed Local → Gate → Walrus promotion. */
  verifiable: boolean;
}

export function classifySearchHit(record: MemoryRecord): {
  source: SearchHitSource;
  verifiable: boolean;
} {
  const verifiable = Boolean(record.synced && record.walrusBlobId);
  if (verifiable) {
    return { source: "hybrid", verifiable: true };
  }
  if (record.walrusBlobId) {
    return { source: "durable", verifiable: false };
  }
  return { source: "local", verifiable: false };
}

export function blendDurableScore(
  semanticScore: number,
  distance: number | undefined,
): number {
  if (distance == null || !Number.isFinite(distance)) {
    return semanticScore;
  }
  const normalized = Math.max(0, Math.min(1, 1 - distance));
  return Math.min(1, semanticScore + normalized * 0.15);
}
