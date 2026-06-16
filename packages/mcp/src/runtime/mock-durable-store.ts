import { createHash, randomUUID } from "node:crypto";

import type {
  DurableMemoryStore,
  DurableRecallHit,
  DurableRememberResult,
  DurableVerifyBlobResult,
  ListVersionsOpts,
  MemoryVersion,
  NamespaceOpts,
  RecallOpts,
  RememberOpts,
} from "@memwalpp/memwal-client";
import type { MemoryRecord } from "@memwalpp/shared";
import { parseContentVersion, parseVersionHistory } from "@memwalpp/shared";

interface StoredBlob {
  recordId: string;
  namespace: string;
  text: string;
  blobId: string;
  metadata: Record<string, string>;
}

function hashContent(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * In-process durable layer for E2E and local dev when MemWal creds are absent.
 * Activated via MEMWAL_MCP_MOCK_DURABLE=1 — never used in production deployments.
 */
export function createMockDurableMemoryStore(defaultNamespace = "default"): DurableMemoryStore {
  const blobs = new Map<string, StoredBlob>();
  const tombstones = new Set<string>();
  const versionsByRecord = new Map<string, MemoryVersion[]>();

  const searchBlobs = async (query: string, opts?: RecallOpts): Promise<DurableRecallHit[]> => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const namespace = opts?.namespace ?? defaultNamespace;
    const limit = opts?.limit ?? 10;
    const hits: DurableRecallHit[] = [];
    for (const blob of blobs.values()) {
      if (blob.namespace !== namespace) continue;
      if (tombstones.has(`${namespace}:${blob.recordId}`)) continue;
      if (!blob.text.toLowerCase().includes(q)) continue;
      hits.push({
        text: blob.text,
        blobId: blob.blobId,
        distance: 0,
        metadata: { ...blob.metadata, namespace },
      });
    }
    return hits.slice(0, limit);
  };

  return {
    isLive: true,

    async remember(record: MemoryRecord, opts?: RememberOpts): Promise<DurableRememberResult> {
      const namespace = opts?.namespace ?? record.namespace ?? defaultNamespace;
      const blobId = record.walrusBlobId ?? `mock-walrus-${randomUUID()}`;
      const version = parseContentVersion(record.metadata);
      blobs.set(blobId, {
        recordId: record.id,
        namespace,
        text: record.content,
        blobId,
        metadata: {
          ...(record.metadata ?? {}),
          recordId: record.id,
          contentHash: hashContent(record.content),
        },
      });
      tombstones.delete(`${namespace}:${record.id}`);

      const promoted: MemoryVersion = {
        version,
        blobId,
        jobId: opts?.wait === false ? `mock-job-${randomUUID()}` : undefined,
        source: "durable",
        promotedAtMs: Date.now(),
      };
      const prior = versionsByRecord.get(record.id) ?? [];
      prior.push(promoted);
      versionsByRecord.set(record.id, prior);

      return {
        recordId: record.id,
        blobId,
        jobId: promoted.jobId,
        namespace,
      };
    },

    async recall(query: string, opts?: RecallOpts): Promise<DurableRecallHit[]> {
      return searchBlobs(query, opts);
    },

    async search(query: string, opts?: RecallOpts): Promise<DurableRecallHit[]> {
      return searchBlobs(query, opts);
    },

    async delete(recordId: string, opts?: NamespaceOpts): Promise<void> {
      const ns = opts?.namespace ?? defaultNamespace;
      tombstones.add(`${ns}:${recordId}`);
    },

    async listVersions(recordId: string, opts?: ListVersionsOpts): Promise<MemoryVersion[]> {
      const ns = opts?.namespace ?? defaultNamespace;
      if (tombstones.has(`${ns}:${recordId}`)) return [];

      const fromMeta = parseVersionHistory(opts?.metadata?.versionHistory)
        .filter((entry) => entry.source === "durable" || entry.blobId)
        .map((entry) => ({
          version: entry.version,
          blobId: entry.blobId,
          jobId: entry.jobId,
          promotedAtMs: entry.atMs,
          source: entry.source === "durable" ? ("durable" as const) : ("metadata" as const),
        }));
      if (fromMeta.length > 0) return fromMeta;

      const stored = versionsByRecord.get(recordId) ?? [];
      if (stored.length > 0) return stored;

      return [{ version: "1", source: "metadata" }];
    },

    async verifyBlob(
      blobId: string,
      opts?: NamespaceOpts & { recordId?: string },
    ): Promise<DurableVerifyBlobResult> {
      const id = blobId.trim();
      if (!id) {
        return { checked: true, live: true, found: false, reasons: ["empty_blob_id"] };
      }
      const ns = opts?.namespace ?? defaultNamespace;
      for (const blob of blobs.values()) {
        if (blob.blobId !== id) continue;
        if (opts?.recordId && blob.recordId !== opts.recordId) continue;
        if (blob.namespace !== ns) continue;
        if (tombstones.has(`${ns}:${blob.recordId}`)) {
          return {
            checked: true,
            live: true,
            found: false,
            blobId: id,
            recordId: blob.recordId,
            namespace: ns,
            reasons: ["blob_tombstoned"],
          };
        }
        return {
          checked: true,
          live: true,
          found: true,
          blobId: id,
          recordId: blob.recordId,
          namespace: ns,
          reasons: [],
        };
      }
      return {
        checked: true,
        live: true,
        found: false,
        blobId: id,
        namespace: ns,
        reasons: ["blob_not_found_in_durable"],
      };
    },

    async health(): Promise<{ ok: boolean; version?: string }> {
      return { ok: true, version: "mock-durable-0.1.0" };
    },

    destroy(): void {
      blobs.clear();
      tombstones.clear();
      versionsByRecord.clear();
    },
  };
}
