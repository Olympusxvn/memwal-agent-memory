import type { MemoryRecord } from "@memwalpp/shared";

import { LocalMemoryError } from "../errors.js";
import { redactForUpstream as runRedactForUpstream } from "../redact.js";
import type { RedactForUpstreamResult } from "../redact.js";
import { scoreQuality as defaultScoreQuality } from "../quality-scorer.js";

export const LOCAL_MEMORY_RECALL_MAX = 500;

export interface RecallParams {
  namespace: string;
  /** Empty string → all rows in namespace (newest first). */
  query: string;
  limit: number;
}

export interface PruneParams {
  /** Delete rows strictly older than this `updatedAtMs` timestamp. */
  olderThanMs?: number;
  /** After other deletes, cap total rows (global or per `namespace`). */
  keepLatest?: number;
  /** When set, both `olderThanMs` and `keepLatest` apply only inside this namespace. */
  namespace?: string;
}

export abstract class LocalMemoryStore {
  /**
   * Upsert a memory row (same `id` replaces).
   * Implementations should validate `record.id` and `record.namespace` non-empty.
   */
  abstract remember(record: MemoryRecord): Promise<void>;

  abstract recall(params: RecallParams): Promise<MemoryRecord[]>;

  abstract getById(id: string): Promise<MemoryRecord | undefined>;

  /** Returns number of rows deleted. */
  abstract prune(params: PruneParams): Promise<number>;

  /** Heuristic 0–100; override for custom scorers. */
  async scoreQuality(text: string): Promise<number> {
    return defaultScoreQuality(text);
  }

  /** PII / secret pipeline; override to compose custom redacters. */
  redactForUpstream(text: string): RedactForUpstreamResult {
    return runRedactForUpstream(text);
  }

  protected static assertNonEmptyId(id: string): void {
    if (!id.trim()) {
      throw new LocalMemoryError("VALIDATION", "LocalMemoryStore: id must be non-empty");
    }
  }

  protected static assertNonEmptyNamespace(ns: string): void {
    if (!ns.trim()) {
      throw new LocalMemoryError("VALIDATION", "LocalMemoryStore: namespace must be non-empty");
    }
  }

  protected static clampRecallLimit(limit: number): number {
    const n = Number.isFinite(limit) ? Math.floor(limit) : 10;
    return Math.min(LOCAL_MEMORY_RECALL_MAX, Math.max(1, n));
  }
}
