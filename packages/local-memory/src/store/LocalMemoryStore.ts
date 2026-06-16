import type { MemoryRecord, RememberOptions } from "@memwalpp/shared";

import { prepareRememberRecord } from "../apply-redaction.js";
import { LocalMemoryError } from "../errors.js";
import { redactForUpstream as runRedactForUpstream } from "../redact.js";
import type { RedactForUpstreamResult } from "../redact.js";
import { scoreQuality as defaultScoreQuality } from "../quality-scorer.js";

export const LOCAL_MEMORY_RECALL_MAX = 500;

export type { RememberOptions };

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
   * When `opts.redactLocal` is true, content is redacted before persistence.
   */
  abstract remember(record: MemoryRecord, opts?: RememberOptions): Promise<void>;

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

  /** Shared redaction prep for remember + upstream callers. */
  prepareRememberRecord(record: MemoryRecord, opts?: RememberOptions): MemoryRecord {
    return prepareRememberRecord((t) => this.redactForUpstream(t), record, opts);
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
