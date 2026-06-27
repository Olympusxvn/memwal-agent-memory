import { createHash } from "node:crypto";

import type { LocalMemoryStore } from "@memwalpp/local-memory";
import type { MemorySyncService } from "@memwalpp/core";
import type { DurableMemoryStore } from "@memwalpp/memwal-client";
import type { MemoryRecord } from "@memwalpp/shared";

import type { MemWalMcpConfig, MemoryProof } from "../types.js";
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

function contentHash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
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

export function createProof(record: MemoryRecord): MemoryProof {
  return {
    version: "1",
    memoryId: record.id,
    namespace: record.namespace,
    contentHash: contentHash(record.content),
    walrusBlobId: record.walrusBlobId,
    issuedAtMs: Date.now(),
  };
}

export function verifyProof(proof: MemoryProof, record?: MemoryRecord): Record<string, unknown> {
  const reasons: string[] = [];
  if (proof.version !== "1") reasons.push("unsupported_proof_version");
  if (!proof.memoryId?.trim()) reasons.push("missing_memory_id");
  if (!proof.contentHash?.trim()) reasons.push("missing_content_hash");

  if (!record) {
    reasons.push("record_not_found");
    return { valid: false, memoryId: proof.memoryId, reasons };
  }

  if (record.id !== proof.memoryId) reasons.push("memory_id_mismatch");
  if (record.namespace !== proof.namespace) reasons.push("namespace_mismatch");
  if (contentHash(record.content) !== proof.contentHash) reasons.push("content_hash_mismatch");
  if (proof.walrusBlobId && record.walrusBlobId !== proof.walrusBlobId) {
    reasons.push("walrus_blob_mismatch");
  }
  if (record.metadata?.deleted === "1" || record.metadata?.deleted === "true") {
    reasons.push("record_deleted");
  }

  return {
    valid: reasons.length === 0,
    memoryId: record.id,
    reasons,
    walrusBlobId: record.walrusBlobId,
    synced: record.synced,
  };
}

export async function handleRemember(
  rt: ToolRuntime,
  args: {
    content: string;
    namespace?: string;
    metadata?: Record<string, string>;
    redactLocal?: boolean;
    promote?: "auto" | "local" | "walrus";
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
  const metadata = args.metadata ? { ...args.metadata } : undefined;
  const redactLocal = args.redactLocal === true;

  const record: MemoryRecord = {
    id,
    namespace,
    content,
    createdAtMs: now,
    updatedAtMs: now,
    synced: false,
    metadata,
  };

  const saved = await rt.sync.remember(record, {
    redactLocal,
    promote: args.promote,
  });

  return {
    recordId: id,
    memoryId: id,
    stored: true,
    namespace,
    redactLocal,
    redacted: saved.metadata?.redacted === "1",
    promote: args.promote ?? "auto",
    proof: JSON.stringify(createProof(saved)),
  };
}

export async function handleSaveArtifact(
  rt: ToolRuntime,
  args: {
    name: string;
    content: string;
    mime?: string;
    namespace?: string;
    promote?: "auto" | "local" | "walrus";
  },
): Promise<Record<string, unknown>> {
  const name = args.name.trim();
  const content = args.content.trim();
  if (!name) return { stored: false, error: "name must be non-empty" };
  if (!content) return { stored: false, error: "content must be non-empty" };

  const wrapped = `# Artifact: ${name}\n\n${content}`;
  const result = await handleRemember(rt, {
    content: wrapped,
    namespace: args.namespace,
    metadata: {
      artifact: "true",
      artifactName: name,
      ...(args.mime?.trim() ? { artifactMime: args.mime.trim() } : {}),
    },
    promote: args.promote ?? "auto",
  });
  return { ...result, artifact: true, artifactName: name };
}

export async function handleRecall(
  rt: ToolRuntime,
  args: {
    query: string;
    options?: {
      namespace?: string;
      limit?: number;
      forceDurable?: boolean;
    };
  },
): Promise<Record<string, unknown>> {
  const namespace = ns(rt.config, args.options?.namespace);
  const limit = Math.min(50, Math.max(1, args.options?.limit ?? 8));
  const forceDurable = args.options?.forceDurable === true;
  const hits = await rt.sync.pullQuery(args.query, { namespace, limit, forceDurable });
  return {
    hits: hits.map(serializeRecord),
    source: forceDurable || rt.durable.isLive ? "hybrid" : "local",
  };
}

export async function handleSearch(
  rt: ToolRuntime,
  args: {
    semantic_query: string;
    limit?: number;
    namespace?: string;
    forceDurable?: boolean;
    includeProof?: boolean;
  },
): Promise<Record<string, unknown>> {
  const namespace = ns(rt.config, args.namespace);
  const limit = Math.min(50, Math.max(1, args.limit ?? 8));
  const q = args.semantic_query.trim();
  if (!q) {
    return { hits: [], source: "local", query: q, durableLive: rt.durable.isLive };
  }

  const ranked = await rt.sync.searchQuery(q, {
    namespace,
    limit,
    forceDurable: args.forceDurable === true,
  });

  const hits = ranked.map((hit) => ({
    ...serializeRecord(hit.record),
    score: hit.score,
    hitSource: hit.source,
    verifiable: hit.verifiable,
    contentHash: contentHash(hit.record.content),
    ...(args.includeProof === true && hit.verifiable
      ? { proof: JSON.stringify(createProof(hit.record)) }
      : {}),
  }));

  const responseSource =
    ranked.some((h) => h.source === "durable" || h.source === "hybrid") && rt.durable.isLive
      ? "hybrid"
      : "local";

  return {
    hits,
    source: responseSource,
    query: q,
    durableLive: rt.durable.isLive,
    verifiableCount: ranked.filter((h) => h.verifiable).length,
  };
}

export async function handleVerify(
  rt: ToolRuntime,
  args: {
    proof?: string;
    memoryId?: string;
    checkWalrus?: boolean;
    checkOnChain?: boolean;
  },
): Promise<Record<string, unknown>> {
  const result = await rt.sync.verifyMemory({
    proof: args.proof,
    memoryId: args.memoryId,
    checkWalrus: args.checkWalrus,
    checkOnChain: args.checkOnChain,
  });
  return result as Record<string, unknown>;
}

export async function handleGetLineage(
  rt: ToolRuntime,
  args: { memoryId: string; includeOnChain?: boolean; maxDepth?: number },
): Promise<Record<string, unknown>> {
  const result = await rt.sync.getLineage(args.memoryId, {
    includeOnChain: args.includeOnChain,
    maxDepth: args.maxDepth,
  });
  return result as Record<string, unknown>;
}

export async function handleGetVersionHistory(
  rt: ToolRuntime,
  args: { memoryId: string; includeProof?: boolean },
): Promise<Record<string, unknown>> {
  const result = await rt.sync.getVersionHistory(args.memoryId);
  if (!result.found) {
    return { found: false, memoryId: args.memoryId };
  }

  const row = args.includeProof ? await rt.local.getById(args.memoryId) : undefined;

  const versions = result.versions.map((v) => ({
    version: v.version,
    source: v.source,
    contentHash: v.contentHash,
    walrusBlobId: v.walrusBlobId ?? v.blobId,
    blobId: v.blobId ?? v.walrusBlobId,
    jobId: v.jobId,
    promotedAtMs: v.promotedAtMs,
    updatedAtMs: v.updatedAtMs,
    synced: v.synced,
    event: v.event,
    ...(args.includeProof === true &&
    row &&
    v.version === result.currentVersion &&
    result.verifiable
      ? { proof: JSON.stringify(createProof(row)) }
      : {}),
  }));

  return {
    found: true,
    memoryId: result.memoryId,
    namespace: result.namespace,
    currentVersion: result.currentVersion,
    latestBlobId: result.latestBlobId,
    verifiable: result.verifiable,
    versions,
    durableLive: result.durableLive,
    ...(result.durableOffline ? { durableOffline: true } : {}),
  };
}

export async function handleGetStats(rt: ToolRuntime): Promise<Record<string, unknown>> {
  const namespace = rt.config.defaultNamespace ?? "default";
  const rows = await rt.local.recall({ namespace, query: "", limit: 500 });
  let synced = 0;
  let pending = 0;
  let tombstones = 0;
  for (const row of rows) {
    if (row.metadata?.deleted === "1" || row.metadata?.deleted === "true") {
      tombstones += 1;
      continue;
    }
    if (row.synced) synced += 1;
    else pending += 1;
  }
  return {
    namespace,
    localRows: rows.length,
    syncedRows: synced,
    pendingSync: pending,
    tombstoneRows: tombstones,
    durableLive: rt.durable.isLive,
  };
}
