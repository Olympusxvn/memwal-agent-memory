import { createHash } from "node:crypto";

/** JSON array stored in `MemoryRecord.metadata.versionHistory`. */
export const VERSION_HISTORY_METADATA_KEY = "versionHistory";

export type StoredVersionSource = "local" | "durable" | "metadata";

export type StoredVersionEvent = "created" | "edited" | "promoted" | "synced";

export interface StoredVersionEntry {
  version: string;
  source: StoredVersionSource;
  atMs: number;
  contentHash?: string;
  blobId?: string;
  jobId?: string;
  event?: StoredVersionEvent;
  synced?: boolean;
}

const MAX_VERSION_ENTRIES = 50;

export function hashMemoryContent(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function parseVersionHistory(raw?: string): StoredVersionEntry[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as StoredVersionEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function serializeVersionHistory(entries: StoredVersionEntry[]): string {
  return JSON.stringify(entries.slice(-MAX_VERSION_ENTRIES));
}

export function appendVersionHistory(
  metadata: Record<string, string> | undefined,
  entry: StoredVersionEntry,
): string {
  const entries = parseVersionHistory(metadata?.[VERSION_HISTORY_METADATA_KEY]);
  const last = entries[entries.length - 1];
  if (
    last &&
    last.version === entry.version &&
    last.contentHash === entry.contentHash &&
    last.source === entry.source &&
    last.blobId === entry.blobId &&
    last.event === entry.event
  ) {
    return serializeVersionHistory(entries);
  }
  entries.push(entry);
  return serializeVersionHistory(entries);
}

export function bumpContentVersion(current?: string): string {
  const n = Number.parseInt(current?.trim() ?? "0", 10);
  return String(Number.isFinite(n) && n >= 0 ? n + 1 : 1);
}

export function parseContentVersion(metadata?: Record<string, string>): string {
  return metadata?.contentVersion?.trim() || "1";
}
