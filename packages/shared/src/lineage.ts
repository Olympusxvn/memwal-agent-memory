/** JSON array stored in `MemoryRecord.metadata.lineageHistory`. */
export const LINEAGE_HISTORY_METADATA_KEY = "lineageHistory";

export type StoredLineageEvent =
  | "created"
  | "edited"
  | "promoted"
  | "merged"
  | "deleted"
  | "forked";

export interface StoredLineageEntry {
  memoryId: string;
  event: StoredLineageEvent;
  atMs: number;
  parentMemoryId?: string;
  rootMemoryId?: string;
  forkDepth?: number;
  walrusBlobId?: string;
  packId?: string;
  detail?: string;
}

export interface LineageNodeRef {
  id: string;
  kind: "memory" | "pack";
  memoryId?: string;
  packId?: string;
}

export interface LineageEdgeRef {
  from: string;
  to: string;
  type: "parent" | "child" | "promoted" | "merged" | "forked";
  atMs?: number;
}

const MAX_LINEAGE_ENTRIES = 50;
const LEGACY_PARENT_KEYS = ["lineageParentId", "parentId"] as const;

export function readLineageParentId(metadata?: Record<string, string>): string | undefined {
  if (!metadata) return undefined;
  for (const key of LEGACY_PARENT_KEYS) {
    const value = metadata[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function readLineageRootId(metadata?: Record<string, string>): string | undefined {
  return metadata?.lineageRootId?.trim() || undefined;
}

export function readForkDepth(metadata?: Record<string, string>): number {
  const raw = metadata?.forkDepth?.trim();
  if (!raw) return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function parseLineageHistory(raw?: string): StoredLineageEntry[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as StoredLineageEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function serializeLineageHistory(entries: StoredLineageEntry[]): string {
  return JSON.stringify(entries.slice(-MAX_LINEAGE_ENTRIES));
}

export function appendLineageEvent(
  metadata: Record<string, string> | undefined,
  entry: StoredLineageEntry,
): string {
  const entries = parseLineageHistory(metadata?.[LINEAGE_HISTORY_METADATA_KEY]);
  const last = entries[entries.length - 1];
  if (
    last &&
    last.memoryId === entry.memoryId &&
    last.event === entry.event &&
    last.atMs === entry.atMs &&
    last.parentMemoryId === entry.parentMemoryId &&
    last.walrusBlobId === entry.walrusBlobId
  ) {
    return serializeLineageHistory(entries);
  }
  entries.push(entry);
  return serializeLineageHistory(entries);
}
