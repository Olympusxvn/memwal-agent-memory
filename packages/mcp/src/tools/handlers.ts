import type { MemorySyncService } from "@memwalpp/core";
import type { LocalMemoryStore } from "@memwalpp/local-memory";
import type { DurableMemoryStore } from "@memwalpp/memwal-client";
import type { MemoryRecord } from "@memwalpp/shared";

import type { MemWalMcpConfig } from "../types.js";
import { MAX_CONTENT_LENGTH } from "../types.js";

export interface ToolRuntime {
  sync: MemorySyncService;
  local: LocalMemoryStore;
  durable: DurableMemoryStore;
  config: Required<Pick<MemWalMcpConfig, "defaultNamespace">> & MemWalMcpConfig;
}

function ns(config: ToolRuntime["config"], namespace?: string): string {
  return namespace?.trim() || config.defaultNamespace || "default";
}

function serializeRecord(row: MemoryRecord): Record<string, unknown> {
  return {
    id: row.id,
    namespace: row.namespace,
    content: row.content,
    createdAtMs: row.createdAtMs,
    updatedAtMs: row.updatedAtMs,
    walrusBlobId: row.walrusBlobId,
    localQualityScore: row.localQualityScore,
    synced: row.synced,
    metadata: row.metadata,
  };
}

export async function handleRemember(
  rt: ToolRuntime,
  args: {
    content: string;
    namespace?: string;
    tags?: string[];
    promote?: boolean;
  },
): Promise<Record<string, unknown>> {
  const content = args.content.trim();
  if (!content) {
    return { stored: false, error: "content must be non-empty" };
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    return { stored: false, error: `content exceeds ${MAX_CONTENT_LENGTH} chars` };
  }

  const namespace = ns(rt.config, args.namespace);
  const now = Date.now();
  const id = crypto.randomUUID();
  const metadata: Record<string, string> = {};
  if (args.tags?.length) {
    metadata.tags = args.tags.join(",");
  }

  await rt.local.remember({
    id,
    namespace,
    content,
    createdAtMs: now,
    updatedAtMs: now,
    synced: false,
    metadata: Object.keys(metadata).length ? metadata : undefined,
  });

  const result: Record<string, unknown> = {
    recordId: id,
    stored: true,
    namespace,
  };

  if (args.promote) {
    const push = await rt.sync.pushOne(id, { namespace });
    result.promoted = push.pushed;
    if (push.blobId) result.blobId = push.blobId;
    if (push.reason) result.skipReason = push.reason;
  }

  return result;
}

export async function handleRecall(
  rt: ToolRuntime,
  args: {
    query: string;
    namespace?: string;
    limit?: number;
    forceDurable?: boolean;
  },
): Promise<Record<string, unknown>> {
  const namespace = ns(rt.config, args.namespace);
  const limit = Math.min(50, Math.max(1, args.limit ?? 8));
  const forceDurable = args.forceDurable === true;
  const hits = await rt.sync.pullQuery(args.query, { namespace, limit, forceDurable });
  return {
    hits: hits.map(serializeRecord),
    source: forceDurable || rt.durable.isLive ? "hybrid" : "local",
  };
}

export async function handleSearch(
  rt: ToolRuntime,
  args: { query: string; namespace?: string; limit?: number },
): Promise<Record<string, unknown>> {
  const namespace = ns(rt.config, args.namespace);
  const limit = Math.min(50, Math.max(1, args.limit ?? 8));
  const hits = await rt.local.recall({ namespace, query: args.query, limit });
  return { hits: hits.map(serializeRecord), source: "local" };
}

export async function handleSync(
  rt: ToolRuntime,
  args: { namespace?: string; mode?: "pending" | "full" },
): Promise<Record<string, unknown>> {
  if (!rt.durable.isLive) {
    return { skipReason: "offline", metrics: { pushed: 0, skipped: 0, failed: 0 } };
  }
  const namespace = ns(rt.config, args.namespace);
  const metrics =
    args.mode === "full"
      ? await rt.sync.fullSync({ namespace })
      : await rt.sync.syncPending({ namespace });
  return { metrics, namespace };
}

export async function handlePromote(
  rt: ToolRuntime,
  args: { recordId: string; namespace?: string },
): Promise<Record<string, unknown>> {
  if (!rt.durable.isLive) {
    return { recordId: args.recordId, promoted: false, skipReason: "offline" };
  }
  const push = await rt.sync.pushOne(args.recordId, { namespace: ns(rt.config, args.namespace) });
  return {
    recordId: push.recordId,
    promoted: push.pushed,
    blobId: push.blobId,
    skipReason: push.reason,
  };
}

export async function handleSoftDelete(
  rt: ToolRuntime,
  args: { recordId: string; namespace?: string },
): Promise<Record<string, unknown>> {
  await rt.sync.softDelete(args.recordId, { namespace: ns(rt.config, args.namespace) });
  return { recordId: args.recordId, deleted: true };
}

export async function handleVerify(
  rt: ToolRuntime,
  args: { recordId: string },
): Promise<Record<string, unknown>> {
  const row = await rt.local.getById(args.recordId);
  if (!row) {
    return { recordId: args.recordId, found: false };
  }
  return {
    recordId: args.recordId,
    found: true,
    walrusBlobId: row.walrusBlobId,
    synced: row.synced,
    metadata: row.metadata,
  };
}

export async function handleGetStats(rt: ToolRuntime): Promise<Record<string, unknown>> {
  const namespace = rt.config.defaultNamespace ?? "default";
  const rows = await rt.local.recall({ namespace, query: "", limit: 500 });
  let synced = 0;
  let pending = 0;
  for (const row of rows) {
    if (row.synced) synced += 1;
    else pending += 1;
  }
  return {
    namespace,
    localRows: rows.length,
    syncedRows: synced,
    pendingSync: pending,
    durableLive: rt.durable.isLive,
  };
}

export function handleChainStub(toolName: string): Record<string, unknown> {
  return {
    skipReason: "not_implemented",
    tool: toolName,
    message: "On-chain PTB wiring is scheduled for Sprint S4 (Phase 8).",
  };
}

export function handleGetLineage(): Record<string, unknown> {
  return {
    skipReason: "indexer_pending",
    message: "Query pack dynamic field (PackExt) via Sui RPC after v2 upgrade bootstrap.",
  };
}
