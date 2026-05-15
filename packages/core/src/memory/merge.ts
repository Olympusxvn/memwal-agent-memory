import type { ObjectId } from "@memwalpp/shared";
import type { MemoryRecord } from "@memwalpp/shared";

import type { DurableRecallHit } from "@memwalpp/memwal-client";
import type { ConflictStrategy } from "./sync-config.js";

function stableIdFromHit(hit: DurableRecallHit, namespace: string, index: number): string {
  if (hit.blobId) {
    return `dur-${hit.blobId.slice(0, 16)}`;
  }
  const basis = `${namespace}:${hit.text.slice(0, 64)}:${index}`;
  let h = 0;
  for (let i = 0; i < basis.length; i++) {
    h = (h * 31 + basis.charCodeAt(i)) >>> 0;
  }
  return `dur-hash-${h.toString(16)}`;
}

function mergeMetadata(
  local: Record<string, string> | undefined,
  incoming: Record<string, string>,
  strategy: ConflictStrategy,
): Record<string, string> {
  if (strategy === "local_wins" && local) {
    return { ...incoming, ...local };
  }
  if (strategy === "merge_metadata") {
    return { ...(local ?? {}), ...incoming };
  }
  return { ...(local ?? {}), ...incoming };
}

/**
 * Map durable recall hit → local row; apply conflict strategy when `existing` provided.
 */
export function mergeDurableHitIntoRecord(
  hit: DurableRecallHit,
  namespace: string,
  existing: MemoryRecord | undefined,
  strategy: ConflictStrategy,
  index: number,
): MemoryRecord {
  const now = Date.now();
  const id = existing?.id ?? stableIdFromHit(hit, namespace, index);
  const walrusBlobId = hit.blobId ? (hit.blobId as ObjectId) : existing?.walrusBlobId;

  let content = hit.text;
  if (existing && strategy === "local_wins" && existing.synced) {
    content = existing.content;
  } else if (existing && strategy === "durable_wins") {
    content = hit.text;
  }

  const metadata = mergeMetadata(existing?.metadata, {
    ...(hit.metadata ?? {}),
    mergedFrom: "durable",
    mergedAtMs: String(now),
  }, strategy);

  return {
    id,
    namespace: existing?.namespace ?? namespace,
    content,
    createdAtMs: existing?.createdAtMs ?? now,
    updatedAtMs: now,
    walrusBlobId,
    synced: true,
    localQualityScore: existing?.localQualityScore,
    metadata,
  };
}

export function isTombstone(record: MemoryRecord): boolean {
  return record.metadata?.deleted === "1" || record.metadata?.deleted === "true";
}

export function allowUpstream(record: MemoryRecord): boolean {
  const v = record.metadata?.allowUpstreamSync;
  if (v === "0" || v === "false") return false;
  return true;
}
