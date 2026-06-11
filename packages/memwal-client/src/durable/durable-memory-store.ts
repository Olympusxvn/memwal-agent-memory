import type { MemoryRecord, ObjectId } from "@memwalpp/shared";

import type { MemWalClientConfig } from "../config.js";
import {
  MemWalConfigError,
  shouldRetryMemWalError,
  wrapMemWalCallError,
} from "../errors.js";
import { withRetry } from "../retry.js";
import type { MemWalService } from "../service.js";
import type {
  DurableMemoryStore,
  DurableRecallHit,
  DurableRememberResult,
  MemoryVersion,
  NamespaceOpts,
  RecallOpts,
  RememberOpts,
} from "./types.js";

export interface DurableMemoryStoreOptions {
  defaultNamespace?: string;
  waitForRemember?: boolean;
  retryMaxAttempts?: number;
  minRequestIntervalMs?: number;
}

function parseContentVersion(metadata?: Record<string, string>): string {
  return metadata?.contentVersion?.trim() || "1";
}

function bumpContentVersion(metadata?: Record<string, string>): string {
  const current = Number.parseInt(parseContentVersion(metadata), 10);
  const next = Number.isFinite(current) ? current + 1 : 1;
  return String(next);
}

class OfflineDurableMemoryStore implements DurableMemoryStore {
  readonly isLive = false;

  remember(): Promise<DurableRememberResult> {
    return Promise.reject(
      new MemWalConfigError(
        "DurableMemoryStore offline. Set MEMWAL_PRIVATE_KEY and MEMWAL_ACCOUNT_ID.",
      ),
    );
  }

  recall(): Promise<DurableRecallHit[]> {
    return Promise.reject(new MemWalConfigError("DurableMemoryStore offline."));
  }

  search(): Promise<DurableRecallHit[]> {
    return Promise.reject(new MemWalConfigError("DurableMemoryStore offline."));
  }

  delete(): Promise<void> {
    return Promise.reject(new MemWalConfigError("DurableMemoryStore offline."));
  }

  listVersions(): Promise<MemoryVersion[]> {
    return Promise.reject(new MemWalConfigError("DurableMemoryStore offline."));
  }

  health(): Promise<{ ok: boolean }> {
    return Promise.resolve({ ok: false });
  }

  destroy(): void {
    /* no-op */
  }
}

class LiveDurableMemoryStore implements DurableMemoryStore {
  readonly isLive = true;
  private readonly service: MemWalService;
  private readonly defaultNamespace: string;
  private readonly waitForRemember: boolean;
  private readonly retryMaxAttempts: number;
  private readonly minRequestIntervalMs: number;
  private lastRequestAtMs = 0;
  /** In-process tombstones until remote delete exists (recordId → namespace). */
  private readonly tombstones = new Set<string>();

  constructor(service: MemWalService, options: DurableMemoryStoreOptions = {}) {
    this.service = service;
    this.defaultNamespace = options.defaultNamespace ?? "default";
    this.waitForRemember = options.waitForRemember ?? false;
    this.retryMaxAttempts = options.retryMaxAttempts ?? 3;
    this.minRequestIntervalMs = options.minRequestIntervalMs ?? 0;
  }

  async remember(record: MemoryRecord, opts?: RememberOpts): Promise<DurableRememberResult> {
    if (!record.id.trim()) {
      throw new RangeError("remember: record.id must be non-empty");
    }
    if (!record.content.trim()) {
      throw new RangeError("remember: record.content must be non-empty");
    }
    const namespace = opts?.namespace ?? record.namespace ?? this.defaultNamespace;
    const wait = opts?.wait ?? this.waitForRemember;

    return this.runWithRetry(async () => {
      const result = await this.service.remember(record.content, {
        namespace,
        wait,
        metadata: {
          ...record.metadata,
          recordId: record.id,
          contentVersion: bumpContentVersion(record.metadata),
        },
      });
      return {
        recordId: record.id,
        jobId: result.jobId,
        blobId: result.blobId,
        namespace,
      };
    });
  }

  async recall(query: string, opts?: RecallOpts): Promise<DurableRecallHit[]> {
    return this.search(query, opts);
  }

  async search(query: string, opts?: RecallOpts): Promise<DurableRecallHit[]> {
    if (!query.trim()) {
      throw new RangeError("recall/search: query must be non-empty");
    }
    const namespace = opts?.namespace ?? this.defaultNamespace;
    const limit = opts?.limit ?? 10;

    const hits = await this.runWithRetry(() => this.service.recall(query, limit, namespace));
    return hits.map((h, i) => ({
      text: h.text,
      blobId: h.blobId,
      distance: h.distance,
      metadata: { namespace, rank: String(i) },
    }));
  }

  async delete(recordId: string, opts?: NamespaceOpts): Promise<void> {
    if (!recordId.trim()) {
      throw new RangeError("delete: recordId must be non-empty");
    }
    const ns = opts?.namespace ?? this.defaultNamespace;
    this.tombstones.add(`${ns}:${recordId}`);
    // Remote delete not exposed by @mysten-incubation/memwal — tombstone only.
  }

  async listVersions(recordId: string, opts?: NamespaceOpts): Promise<MemoryVersion[]> {
    if (!recordId.trim()) {
      throw new RangeError("listVersions: recordId must be non-empty");
    }
    const ns = opts?.namespace ?? this.defaultNamespace;
    if (this.tombstones.has(`${ns}:${recordId}`)) {
      return [];
    }
    // Without a durable index API, expose a single logical version placeholder.
    // Wave 2 sync will populate metadata keys on the local record.
    return [
      {
        version: "1",
        source: "metadata",
      },
    ];
  }

  async health(): Promise<{ ok: boolean; version?: string }> {
    if (!this.service.isLive) {
      return { ok: false };
    }
    return this.runWithRetry(() => this.service.health());
  }

  destroy(): void {
    this.service.destroy();
  }

  private async throttle(): Promise<void> {
    if (this.minRequestIntervalMs <= 0) return;
    const now = Date.now();
    const elapsed = now - this.lastRequestAtMs;
    if (elapsed < this.minRequestIntervalMs) {
      await new Promise((r) => setTimeout(r, this.minRequestIntervalMs - elapsed));
    }
    this.lastRequestAtMs = Date.now();
  }

  private async runWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    await this.throttle();
    try {
      return await withRetry(
        async () => {
          try {
            return await fn();
          } catch (e) {
            throw wrapMemWalCallError(e);
          }
        },
        {
          maxAttempts: this.retryMaxAttempts,
          shouldRetry: (e) => shouldRetryMemWalError(e),
        },
      );
    } finally {
      this.lastRequestAtMs = Date.now();
    }
  }
}

const offlineDurable = new OfflineDurableMemoryStore();

export function createDurableMemoryStore(
  service: MemWalService,
  options?: DurableMemoryStoreOptions,
): DurableMemoryStore {
  if (!service.isLive) {
    return offlineDurable;
  }
  return new LiveDurableMemoryStore(service, options);
}

export function durableOptionsFromConfig(config: MemWalClientConfig): DurableMemoryStoreOptions {
  return {
    defaultNamespace: config.namespace,
    waitForRemember: config.waitForRemember,
    retryMaxAttempts: config.retryMaxAttempts,
    minRequestIntervalMs: config.minRequestIntervalMs,
  };
}

/** Apply durable remember result onto a MemoryRecord (immutable return). */
export function applyRememberResult(
  record: MemoryRecord,
  result: DurableRememberResult,
): MemoryRecord {
  const walrusBlobId = result.blobId
    ? (result.blobId as ObjectId)
    : record.walrusBlobId;
  return {
    ...record,
    namespace: result.namespace,
    // "synced" = durable layer accepted the write (jobId) or finished it (blobId).
    // Async remember returns only a jobId; marking synced avoids re-pushing it.
    synced: Boolean(result.blobId || result.jobId),
    walrusBlobId,
    metadata: {
      ...record.metadata,
      lastJobId: result.jobId ?? record.metadata?.lastJobId ?? "",
      // "1" until the blob id is known (async remember without wait).
      walrusPending: result.blobId ? "0" : "1",
      promotedAtMs: String(Date.now()),
      contentVersion: bumpContentVersion(record.metadata),
    },
  };
}
