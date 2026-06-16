import type { MemoryRecord } from "@memwalpp/shared";
import {
  hashMemoryContent,
  parseContentVersion,
  parseVersionHistory,
  type StoredVersionEntry,
} from "@memwalpp/shared";

export interface VersionHistoryEntry {
  version: string;
  source: "local" | "durable" | "metadata";
  contentHash?: string;
  walrusBlobId?: string;
  blobId?: string;
  jobId?: string;
  promotedAtMs?: number;
  updatedAtMs?: number;
  synced?: boolean;
  event?: string;
}

export interface VersionHistoryResult {
  found: boolean;
  memoryId: string;
  namespace?: string;
  currentVersion?: string;
  latestBlobId?: string;
  verifiable?: boolean;
  versions: VersionHistoryEntry[];
  durableLive: boolean;
  durableOffline?: boolean;
}

function storedToEntry(row: StoredVersionEntry): VersionHistoryEntry {
  const blobId = row.blobId;
  return {
    version: row.version,
    source: row.source,
    contentHash: row.contentHash,
    walrusBlobId: blobId,
    blobId,
    jobId: row.jobId,
    promotedAtMs: row.source === "durable" ? row.atMs : undefined,
    updatedAtMs: row.atMs,
    synced: row.synced,
    event: row.event,
  };
}

function legacyEntriesFromRecord(row: MemoryRecord): VersionHistoryEntry[] {
  const md = row.metadata ?? {};
  const entries: VersionHistoryEntry[] = [
    {
      version: parseContentVersion(md),
      source: "local",
      updatedAtMs: row.createdAtMs,
      contentHash: hashMemoryContent(row.content),
      synced: row.synced,
      walrusBlobId: row.walrusBlobId,
      blobId: row.walrusBlobId,
      event: "created",
    },
  ];

  const promotedAt = md.promotedAtMs ?? md.syncedAtMs;
  if (row.synced && (row.walrusBlobId || md.jobId || md.lastJobId)) {
    entries.push({
      version: parseContentVersion(md),
      source: row.walrusBlobId ? "durable" : "metadata",
      contentHash: hashMemoryContent(row.content),
      walrusBlobId: row.walrusBlobId,
      blobId: row.walrusBlobId,
      jobId: md.jobId || md.lastJobId,
      promotedAtMs: promotedAt ? Number(promotedAt) : row.updatedAtMs,
      updatedAtMs: promotedAt ? Number(promotedAt) : row.updatedAtMs,
      synced: true,
      event: "promoted",
    });
  }

  return entries;
}

export function buildVersionHistoryFromRecord(row: MemoryRecord): VersionHistoryEntry[] {
  const stored = parseVersionHistory(row.metadata?.versionHistory);
  if (stored.length > 0) {
    return stored.map(storedToEntry);
  }
  return legacyEntriesFromRecord(row);
}

export function mergeVersionEntries(
  local: VersionHistoryEntry[],
  durable: VersionHistoryEntry[],
): VersionHistoryEntry[] {
  const byVersion = new Map<string, VersionHistoryEntry>();

  for (const entry of local) {
    byVersion.set(entry.version, entry);
  }

  for (const entry of durable) {
    const prior = byVersion.get(entry.version);
    if (!prior) {
      byVersion.set(entry.version, entry);
      continue;
    }
    byVersion.set(entry.version, {
      ...prior,
      ...entry,
      source: entry.source === "durable" ? "durable" : prior.source,
      walrusBlobId: entry.walrusBlobId ?? prior.walrusBlobId,
      blobId: entry.blobId ?? prior.blobId,
      jobId: entry.jobId ?? prior.jobId,
      promotedAtMs: entry.promotedAtMs ?? prior.promotedAtMs,
      synced: entry.synced ?? prior.synced,
    });
  }

  return [...byVersion.values()].sort(
    (a, b) => Number.parseInt(a.version, 10) - Number.parseInt(b.version, 10),
  );
}
