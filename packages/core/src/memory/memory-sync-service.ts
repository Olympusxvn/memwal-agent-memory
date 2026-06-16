import type { ChainReader, DurableMemoryStore } from "@memwalpp/memwal-client";
import { MemWalConfigError } from "@memwalpp/memwal-client";
import {
  applyRedactionToRecord,
  isLocallyRedacted,
  LOCAL_MEMORY_RECALL_MAX,
  type LocalMemoryStore,
  scoreSemanticMatch,
} from "@memwalpp/local-memory";
import type { MemoryRecord, ObjectId, RememberOptions } from "@memwalpp/shared";
import {
  appendVersionHistory,
  bumpContentVersion,
  hashMemoryContent,
  MEMORY_METADATA_KEYS,
  parseContentVersion,
  appendLineageEvent,
  readLineageParentId,
  readLineageRootId,
} from "@memwalpp/shared";

import { allowUpstream, isTombstone, mergeDurableHitIntoRecord } from "./merge.js";
import {
  blendDurableScore,
  classifySearchHit,
  type SearchHit,
  type SearchQueryOpts,
} from "./search-query.js";
import {
  buildVersionHistoryFromRecord,
  mergeVersionEntries,
  type VersionHistoryResult,
} from "./version-history.js";
import {
  resolveLineageForRecord,
  type LineageResult,
} from "./lineage-index.js";
import type { MemorySyncConfig, PullQueryOpts } from "./sync-config.js";
import { resolveSyncConfig } from "./sync-config.js";
import { SyncError } from "./sync-errors.js";
import type { SyncLogger } from "./sync-logger.js";
import { noopSyncLogger } from "./sync-logger.js";
import { emptySyncMetrics, mergeSyncMetrics, type SyncMetrics } from "./sync-metrics.js";
import {
  verifyMemoryLayers,
  type VerifyMemoryInput,
  type VerifyMemoryResult,
} from "./verify-memory.js";

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
  chainReader?: ChainReader | null;
  config?: MemorySyncConfig;
  logger?: SyncLogger;
}

export interface MemorySyncService {
  remember(record: MemoryRecord, opts?: RememberOptions): Promise<MemoryRecord>;
  pushOne(recordId: string, opts?: { namespace?: string }): Promise<PushOneResult>;
  pullQuery(query: string, opts?: PullQueryOpts): Promise<MemoryRecord[]>;
  searchQuery(query: string, opts?: SearchQueryOpts): Promise<SearchHit[]>;
  getVersionHistory(memoryId: string, opts?: { namespace?: string }): Promise<VersionHistoryResult>;
  getLineage(
    memoryId: string,
    opts?: { namespace?: string; includeOnChain?: boolean; maxDepth?: number },
  ): Promise<LineageResult | { found: false; memoryId: string; durableLive: boolean }>;
  verifyMemory(input: VerifyMemoryInput): Promise<VerifyMemoryResult | { valid: false; reasons: string[] }>;
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
    private readonly chainReader: ChainReader | null | undefined,
    config?: MemorySyncConfig,
    logger?: SyncLogger,
  ) {
    this.cfg = resolveSyncConfig(config);
    this.log = logger ?? noopSyncLogger;
  }

  async remember(record: MemoryRecord, opts?: RememberOptions): Promise<MemoryRecord> {
    const existing = await this.local.getById(record.id);
    let toSave = record;

    if (existing) {
      const contentChanged = hashMemoryContent(existing.content) !== hashMemoryContent(record.content);
      if (contentChanged) {
        const nextVersion = bumpContentVersion(existing.metadata?.contentVersion);
        const versionHistory = appendVersionHistory(existing.metadata, {
          version: nextVersion,
          source: "local",
          atMs: Date.now(),
          contentHash: hashMemoryContent(record.content),
          event: "edited",
        });
        toSave = {
          ...record,
          metadata: {
            ...(record.metadata ?? {}),
            contentVersion: nextVersion,
            versionHistory,
            [MEMORY_METADATA_KEYS.lineageHistory]: appendLineageEvent(existing.metadata, {
              memoryId: record.id,
              event: "edited",
              atMs: Date.now(),
              parentMemoryId: readLineageParentId(existing.metadata),
              rootMemoryId: readLineageRootId(existing.metadata) ?? record.id,
            }),
          },
        };
      }
    } else {
      const versionHistory = appendVersionHistory(record.metadata, {
        version: "1",
        source: "local",
        atMs: record.createdAtMs,
        contentHash: hashMemoryContent(record.content),
        event: "created",
      });
      toSave = {
        ...record,
        metadata: {
          ...(record.metadata ?? {}),
          contentVersion: "1",
          versionHistory,
          [MEMORY_METADATA_KEYS.lineageRootId]: record.id,
          [MEMORY_METADATA_KEYS.forkDepth]: "0",
          [MEMORY_METADATA_KEYS.lineageHistory]: appendLineageEvent(record.metadata, {
            memoryId: record.id,
            event: "created",
            atMs: record.createdAtMs,
            rootMemoryId: record.id,
            forkDepth: 0,
          }),
        },
      };
    }

    await this.local.remember(toSave, opts);
    const saved = await this.local.getById(record.id);
    return saved ?? toSave;
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
    const nextVersion = bumpContentVersion(existing.metadata?.contentVersion);
    const prePush = applyRedactionToRecord(existing, redacted, {
      contentVersion: nextVersion,
      pushedAtMs: String(now),
      ...(isLocallyRedacted(existing)
        ? { [MEMORY_METADATA_KEYS.redactLocal]: "1" }
        : {}),
    });
    const prePushRecord: MemoryRecord = {
      ...prePush,
      namespace,
      updatedAtMs: now,
      localQualityScore: score,
      synced: false,
    };

    await this.local.remember(prePushRecord);

    try {
      const durableResult = await this.durable.remember(prePushRecord, {
        namespace,
        wait: this.cfg.waitForPush,
      });

      const promotedAtMs = Date.now();
      const lineageHistory = appendLineageEvent(prePush.metadata, {
        memoryId: id,
        event: "promoted",
        atMs: promotedAtMs,
        parentMemoryId: readLineageParentId(prePush.metadata),
        rootMemoryId: readLineageRootId(prePush.metadata) ?? id,
        walrusBlobId: durableResult.blobId,
        forkDepth: readLineageParentId(prePush.metadata) ? 1 : 0,
      });
      const versionHistory = appendVersionHistory(prePush.metadata, {
        version: nextVersion,
        source: "durable",
        atMs: promotedAtMs,
        contentHash: hashMemoryContent(prePush.content),
        blobId: durableResult.blobId,
        jobId: durableResult.jobId,
        event: "promoted",
        synced: true,
      });

      const synced: MemoryRecord = {
        ...prePushRecord,
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
          [MEMORY_METADATA_KEYS.lastJobId]: durableResult.jobId ?? "",
          walrusPending: durableResult.blobId ? "0" : "1",
          [MEMORY_METADATA_KEYS.syncedAtMs]: String(promotedAtMs),
          [MEMORY_METADATA_KEYS.promotedAtMs]: String(promotedAtMs),
          [MEMORY_METADATA_KEYS.contentVersion]: nextVersion,
          [MEMORY_METADATA_KEYS.versionHistory]: versionHistory,
          [MEMORY_METADATA_KEYS.lineageHistory]: lineageHistory,
          [MEMORY_METADATA_KEYS.lineageRootId]:
            readLineageRootId(prePush.metadata) ?? id,
          [MEMORY_METADATA_KEYS.forkDepth]: readLineageParentId(prePush.metadata)
            ? "1"
            : "0",
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

  async searchQuery(query: string, opts?: SearchQueryOpts): Promise<SearchHit[]> {
    const namespace = opts?.namespace ?? this.cfg.defaultNamespace;
    const limit = Math.min(50, Math.max(1, opts?.limit ?? 8));
    const minScore = opts?.minScore ?? 0.05;
    const q = query.trim();
    if (!q) return [];

    const ranked = await this.rankLocalSemantic(namespace, q, minScore);
    const shouldHydrate =
      this.durable.isLive &&
      (opts?.forceDurable === true || ranked.length < limit);

    if (!shouldHydrate) {
      return ranked.slice(0, limit);
    }

    try {
      await this.mergeDurableSearchHits(namespace, q, minScore, limit, ranked);
    } catch (err) {
      if (err instanceof MemWalConfigError) {
        this.log.warn("search durable offline", { namespace });
        return ranked.slice(0, limit);
      }
      throw err;
    }

    ranked.sort((a, b) => b.score - a.score);
    return ranked.slice(0, limit);
  }

  private async rankLocalSemantic(
    namespace: string,
    query: string,
    minScore: number,
  ): Promise<SearchHit[]> {
    const rows = await this.local.recall({
      namespace,
      query: "",
      limit: LOCAL_MEMORY_RECALL_MAX,
    });
    const hits: SearchHit[] = [];
    for (const row of rows) {
      if (isTombstone(row)) continue;
      const score = scoreSemanticMatch(query, row.content);
      if (score < minScore) continue;
      const { source, verifiable } = classifySearchHit(row);
      hits.push({ record: row, score, source, verifiable });
    }
    hits.sort((a, b) => b.score - a.score);
    return hits;
  }

  private async mergeDurableSearchHits(
    namespace: string,
    query: string,
    minScore: number,
    fetchLimit: number,
    ranked: SearchHit[],
  ): Promise<void> {
    const durableHits = await this.durable.search(query, { namespace, limit: fetchLimit });
    const byBlobId = await this.indexLocalByBlobId(namespace);
    const byId = new Map(ranked.map((h) => [h.record.id, h]));

    for (let i = 0; i < durableHits.length; i++) {
      const hit = durableHits[i]!;
      const recordId = hit.metadata?.recordId;
      const existing =
        (recordId ? await this.local.getById(recordId) : undefined) ??
        (hit.blobId ? byBlobId.get(hit.blobId) : undefined);

      if (existing && isTombstone(existing)) continue;

      const merged = mergeDurableHitIntoRecord(
        hit,
        namespace,
        existing,
        this.cfg.conflictStrategy,
        i,
      );
      await this.local.remember(merged);

      const score = blendDurableScore(scoreSemanticMatch(query, merged.content), hit.distance);
      if (score < minScore) continue;

      const { source, verifiable } = classifySearchHit(merged);
      const next: SearchHit = { record: merged, score, source, verifiable };
      const prior = byId.get(merged.id);
      if (!prior || score > prior.score) {
        byId.set(merged.id, next);
      }
    }

    ranked.length = 0;
    ranked.push(...byId.values());
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

  async getVersionHistory(
    memoryId: string,
    opts?: { namespace?: string },
  ): Promise<VersionHistoryResult> {
    const id = memoryId.trim();
    if (!id) {
      return { found: false, memoryId: id, versions: [], durableLive: this.durable.isLive };
    }

    const row = await this.local.getById(id);
    if (!row) {
      return { found: false, memoryId: id, versions: [], durableLive: this.durable.isLive };
    }

    const namespace = opts?.namespace ?? row.namespace;
    const localVersions = buildVersionHistoryFromRecord(row);
    let durableOffline = false;
    let durableVersions: ReturnType<typeof buildVersionHistoryFromRecord> = [];

    if (this.durable.isLive) {
      try {
        const durableList = await this.durable.listVersions(id, {
          namespace,
          metadata: row.metadata,
          walrusBlobId: row.walrusBlobId,
          synced: row.synced,
        });
        durableVersions = durableList.map((v) => ({
          version: v.version,
          source: v.source === "durable" ? ("durable" as const) : ("metadata" as const),
          blobId: v.blobId,
          walrusBlobId: v.blobId,
          jobId: v.jobId,
          promotedAtMs: v.promotedAtMs,
          updatedAtMs: v.promotedAtMs,
          synced: Boolean(v.blobId || v.jobId),
          event: "promoted",
        }));
      } catch (err) {
        if (err instanceof MemWalConfigError) {
          durableOffline = true;
        } else {
          throw err;
        }
      }
    }

    const versions = mergeVersionEntries(localVersions, durableVersions);
    const currentVersion = parseContentVersion(row.metadata);
    const latestBlobId = row.walrusBlobId ?? versions.at(-1)?.walrusBlobId;

    return {
      found: true,
      memoryId: id,
      namespace,
      currentVersion,
      latestBlobId,
      verifiable: Boolean(row.synced && latestBlobId),
      versions,
      durableLive: this.durable.isLive,
      ...(durableOffline ? { durableOffline: true } : {}),
    };
  }

  async getLineage(
    memoryId: string,
    opts?: { namespace?: string; includeOnChain?: boolean; maxDepth?: number },
  ): Promise<LineageResult | { found: false; memoryId: string; durableLive: boolean }> {
    const id = memoryId.trim();
    if (!id) {
      return { found: false, memoryId: id, durableLive: this.durable.isLive };
    }

    const row = await this.local.getById(id);
    if (!row) {
      return { found: false, memoryId: id, durableLive: this.durable.isLive };
    }

    return resolveLineageForRecord({
      local: this.local,
      row,
      namespace: opts?.namespace ?? row.namespace,
      maxDepth: opts?.maxDepth,
      includeOnChain: opts?.includeOnChain,
      durableLive: this.durable.isLive,
      readPackLineage: this.chainReader?.isLive
        ? async (packId) => {
            const chain = await this.chainReader!.readPackLineage(packId);
            return {
              checked: chain.checked,
              live: chain.live,
              packId: chain.packId,
              parentPackId: chain.parentPackId,
              rootPackId: chain.rootPackId,
              forkDepth: chain.forkDepth,
              ancestors: chain.ancestors,
              version: chain.version,
              reasons: chain.reasons,
            };
          }
        : undefined,
    });
  }

  async verifyMemory(
    input: VerifyMemoryInput,
  ): Promise<VerifyMemoryResult | { valid: false; reasons: string[] }> {
    return verifyMemoryLayers({
      local: this.local,
      durable: this.durable,
      chainReader: this.chainReader,
      input,
    });
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

export function createMemorySyncService(deps: MemorySyncServiceDeps): MemorySyncService {
  return new MemorySyncServiceImpl(
    deps.local,
    deps.durable,
    deps.chainReader,
    deps.config,
    deps.logger,
  );
}
