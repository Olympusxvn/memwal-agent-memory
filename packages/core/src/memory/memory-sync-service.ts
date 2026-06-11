import type { DurableMemoryStore } from "@memwalpp/memwal-client";
import { MemWalConfigError } from "@memwalpp/memwal-client";
import { LOCAL_MEMORY_RECALL_MAX, type LocalMemoryStore } from "@memwalpp/local-memory";
import type { MemoryRecord, ObjectId } from "@memwalpp/shared";

import { allowUpstream, isTombstone, mergeDurableHitIntoRecord } from "./merge.js";
import type { MemorySyncConfig, PullQueryOpts } from "./sync-config.js";
import { resolveSyncConfig } from "./sync-config.js";
import { SyncError } from "./sync-errors.js";
import type { SyncLogger } from "./sync-logger.js";
import { noopSyncLogger } from "./sync-logger.js";
import { emptySyncMetrics, mergeSyncMetrics, type SyncMetrics } from "./sync-metrics.js";

export type PushSkipReason =
  | "offline"
  | "tombstone"
  | "gate"
  | "allow_upstream_false"
  | "not_found"
  | "error";

export interface PushOneResult {
  recordId: string;
  pushed: boolean;
  reason?: PushSkipReason;
  blobId?: string;
  jobId?: string;
}

export interface MemorySyncServiceDeps {
  local: LocalMemoryStore;
  durable: DurableMemoryStore;
  config?: MemorySyncConfig;
  logger?: SyncLogger;
}

export interface MemorySyncService {
  pushOne(recordId: string, opts?: { namespace?: string }): Promise<PushOneResult>;
  pullQuery(query: string, opts?: PullQueryOpts): Promise<MemoryRecord[]>;
  syncPending(opts?: { namespace?: string }): Promise<SyncMetrics>;
  fullSync(opts?: { namespace?: string }): Promise<SyncMetrics>;
  softDelete(recordId: string, opts?: { namespace?: string }): Promise<void>;
}

class MemorySyncServiceImpl implements MemorySyncService {
  private readonly cfg: ReturnType<typeof resolveSyncConfig>;
  private readonly log: SyncLogger;

  constructor(
    private readonly local: LocalMemoryStore,
    private readonly durable: DurableMemoryStore,
    config?: MemorySyncConfig,
    logger?: SyncLogger,
  ) {
    this.cfg = resolveSyncConfig(config);
    this.log = logger ?? noopSyncLogger;
  }

  async pushOne(
    recordId: string,
    opts?: { namespace?: string },
  ): Promise<PushOneResult> {
    const id = recordId.trim();
    if (!id) {
      throw new SyncError("NOT_FOUND", "pushOne: recordId must be non-empty");
    }

    const existing = await this.local.getById(id);
    if (!existing) {
      return { recordId: id, pushed: false, reason: "not_found" };
    }

    const namespace = opts?.namespace ?? existing.namespace ?? this.cfg.defaultNamespace;

    if (isTombstone(existing)) {
      this.log.info("push skipped tombstone", { recordId: id });
      return { recordId: id, pushed: false, reason: "tombstone" };
    }

    if (!allowUpstream(existing)) {
      return { recordId: id, pushed: false, reason: "allow_upstream_false" };
    }

    if (!this.durable.isLive) {
      return { recordId: id, pushed: false, reason: "offline" };
    }

    const redacted = this.local.redactForUpstream(existing.content);
    const score = await this.local.scoreQuality(redacted.text);
    if (score < this.cfg.qualityMin) {
      this.log.warn("push blocked quality gate", { recordId: id, score });
      return { recordId: id, pushed: false, reason: "gate" };
    }

    const now = Date.now();
    const prePush: MemoryRecord = {
      ...existing,
      namespace,
      content: redacted.text,
      updatedAtMs: now,
      localQualityScore: score,
      synced: false,
      metadata: {
        ...(existing.metadata ?? {}),
        redacted: redacted.piiFlags.length > 0 ? "1" : "0",
        piiFlags: redacted.piiFlags.join(","),
        contentVersion: bumpVersion(existing.metadata?.contentVersion),
        pushedAtMs: String(now),
      },
    };

    await this.local.remember(prePush);

    try {
      const durableResult = await this.durable.remember(prePush, {
        namespace,
        wait: this.cfg.waitForPush,
      });

      const synced: MemoryRecord = {
        ...prePush,
        // Durable layer accepted (jobId) or finished (blobId) the write; either
        // way the record is handed off, so don't re-push it on the next sync.
        synced: Boolean(durableResult.blobId || durableResult.jobId),
        updatedAtMs: Date.now(),
        walrusBlobId: durableResult.blobId
          ? (durableResult.blobId as ObjectId)
          : prePush.walrusBlobId,
        metadata: {
          ...(prePush.metadata ?? {}),
          durableNamespace: durableResult.namespace,
          jobId: durableResult.jobId ?? "",
          walrusPending: durableResult.blobId ? "0" : "1",
          syncedAtMs: String(Date.now()),
        },
      };
      await this.local.remember(synced);

      this.log.info("push ok", {
        recordId: id,
        blobId: synced.walrusBlobId ?? "",
      });

      return {
        recordId: id,
        pushed: true,
        blobId: durableResult.blobId,
        jobId: durableResult.jobId,
      };
    } catch (err) {
      this.log.warn("push failed", {
        recordId: id,
        error: err instanceof Error ? err.name : "unknown",
      });
      return { recordId: id, pushed: false, reason: "error" };
    }
  }

  async pullQuery(query: string, opts?: PullQueryOpts): Promise<MemoryRecord[]> {
    const namespace = opts?.namespace ?? this.cfg.defaultNamespace;
    const limit = opts?.limit ?? 20;
    const q = query.trim();

    const localHits = await this.local.recall({
      namespace,
      query: q,
      limit,
    });

    const shouldHydrate =
      this.durable.isLive &&
      q.length > 0 &&
      (opts?.forceDurable === true || localHits.length < limit);

    if (!shouldHydrate) {
      return localHits;
    }

    try {
      const durableHits = await this.durable.search(q, { namespace, limit });
      // The relayer recall API returns only { text, blobId, distance } (no
      // server-readable metadata), so a hit usually has no recordId to reconcile
      // against. Index local rows by walrusBlobId to re-attach pulled hits to the
      // record that produced them instead of creating duplicate `dur-*` rows.
      const byBlobId = await this.indexLocalByBlobId(namespace);
      for (let i = 0; i < durableHits.length; i++) {
        const hit = durableHits[i]!;
        const recordId = hit.metadata?.recordId;
        const existing =
          (recordId ? await this.local.getById(recordId) : undefined) ??
          (hit.blobId ? byBlobId.get(hit.blobId) : undefined);
        const merged = mergeDurableHitIntoRecord(
          hit,
          namespace,
          existing,
          this.cfg.conflictStrategy,
          i,
        );
        if (existing && isTombstone(existing)) {
          continue;
        }
        await this.local.remember(merged);
      }
    } catch (err) {
      if (err instanceof MemWalConfigError) {
        this.log.warn("pull durable offline", { namespace });
        return localHits;
      }
      throw err;
    }

    return this.local.recall({ namespace, query: q, limit });
  }

  /** Map walrusBlobId → local record for a namespace (best-effort, bounded). */
  private async indexLocalByBlobId(
    namespace: string,
  ): Promise<Map<string, MemoryRecord>> {
    const rows = await this.local.recall({
      namespace,
      query: "",
      limit: LOCAL_MEMORY_RECALL_MAX,
    });
    const byBlobId = new Map<string, MemoryRecord>();
    for (const row of rows) {
      if (row.walrusBlobId) {
        byBlobId.set(row.walrusBlobId, row);
      }
    }
    return byBlobId;
  }

  async syncPending(opts?: { namespace?: string }): Promise<SyncMetrics> {
    const metrics = emptySyncMetrics();
    const namespace = opts?.namespace ?? this.cfg.defaultNamespace;

    const pending = await this.local.recall({
      namespace,
      query: "",
      limit: 500,
    });

    for (const row of pending) {
      if (row.synced || isTombstone(row)) {
        metrics.skipped += 1;
        continue;
      }
      if (!allowUpstream(row)) {
        metrics.skipped += 1;
        continue;
      }

      const result = await this.pushOne(row.id, { namespace });
      if (result.pushed) {
        metrics.pushed += 1;
      } else if (result.reason === "error") {
        metrics.failed += 1;
      } else {
        metrics.skipped += 1;
      }
    }

    return metrics;
  }

  async fullSync(opts?: { namespace?: string }): Promise<SyncMetrics> {
    const namespace = opts?.namespace ?? this.cfg.defaultNamespace;
    const pushMetrics = await this.syncPending({ namespace });
    const pulled = await this.pullQuery("", {
      namespace,
      limit: 100,
      forceDurable: false,
    });
    const pullMetrics = emptySyncMetrics();
    pullMetrics.pulled = pulled.length;
    return mergeSyncMetrics(pushMetrics, pullMetrics);
  }

  async softDelete(recordId: string, opts?: { namespace?: string }): Promise<void> {
    const id = recordId.trim();
    if (!id) {
      throw new SyncError("NOT_FOUND", "softDelete: recordId must be non-empty");
    }
    const existing = await this.local.getById(id);
    if (!existing) {
      throw new SyncError("NOT_FOUND", `softDelete: no local record ${id}`);
    }
    const namespace = opts?.namespace ?? existing.namespace;
    const now = Date.now();
    await this.local.remember({
      ...existing,
      namespace,
      updatedAtMs: now,
      metadata: {
        ...(existing.metadata ?? {}),
        deleted: "1",
        deletedAtMs: String(now),
      },
    });
    if (this.durable.isLive) {
      try {
        await this.durable.delete(id, { namespace });
      } catch {
        /* tombstone local-only when durable delete unavailable */
      }
    }
  }
}

function bumpVersion(current?: string): string {
  const n = Number.parseInt(current?.trim() ?? "0", 10);
  return String(Number.isFinite(n) && n >= 0 ? n + 1 : 1);
}

export function createMemorySyncService(deps: MemorySyncServiceDeps): MemorySyncService {
  return new MemorySyncServiceImpl(
    deps.local,
    deps.durable,
    deps.config,
    deps.logger,
  );
}
