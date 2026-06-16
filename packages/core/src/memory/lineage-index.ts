import type { LocalMemoryStore } from "@memwalpp/local-memory";
import { LOCAL_MEMORY_RECALL_MAX } from "@memwalpp/local-memory";
import type { MemoryRecord } from "@memwalpp/shared";
import {
  MEMORY_METADATA_KEYS,
  parseContentVersion,
  parseLineageHistory,
  readForkDepth,
  readLineageParentId,
  readLineageRootId,
} from "@memwalpp/shared";

export interface LineageGraphNode {
  id: string;
  kind: "memory" | "pack";
  memoryId?: string;
  packId?: string;
  walrusBlobId?: string;
  contentVersion?: string;
  synced?: boolean;
  forkDepth?: number;
  deleted?: boolean;
}

export interface LineageGraphEdge {
  from: string;
  to: string;
  type: "parent" | "child" | "promoted" | "merged" | "forked";
  atMs?: number;
  detail?: string;
}

export interface LineageTimelineEvent {
  type: string;
  atMs: number;
  detail?: string;
}

export interface LocalLineageGraph {
  nodes: LineageGraphNode[];
  edges: LineageGraphEdge[];
  events: LineageTimelineEvent[];
  rootMemoryId: string;
  forkDepth: number;
}

export interface OnChainPackLineage {
  checked: boolean;
  live: boolean;
  packId?: string;
  parentPackId?: string;
  rootPackId?: string;
  forkDepth?: number;
  ancestors?: string[];
  version?: number;
  reasons: string[];
}

export interface LineageGraphResult {
  nodes: LineageGraphNode[];
  edges: LineageGraphEdge[];
  rootId: string;
}

export interface LineageResult {
  found: boolean;
  memoryId: string;
  namespace?: string;
  contentVersion?: string;
  walrusBlobId?: string;
  synced?: boolean;
  verifiable?: boolean;
  local: LocalLineageGraph;
  onChain: OnChainPackLineage;
  graph: LineageGraphResult;
  durableLive: boolean;
}

function nodeIdForMemory(memoryId: string): string {
  return `mem:${memoryId}`;
}

function nodeIdForPack(packId: string): string {
  return `pack:${packId}`;
}

function memoryNodeFromRecord(row: MemoryRecord): LineageGraphNode {
  const md = row.metadata ?? {};
  return {
    id: nodeIdForMemory(row.id),
    kind: "memory",
    memoryId: row.id,
    packId: md[MEMORY_METADATA_KEYS.packId],
    walrusBlobId: row.walrusBlobId,
    contentVersion: parseContentVersion(md),
    synced: row.synced,
    forkDepth: readForkDepth(md),
    deleted: md.deleted === "1" || md.deleted === "true",
  };
}

function legacyEventsFromRecord(row: MemoryRecord): LineageTimelineEvent[] {
  const md = row.metadata ?? {};
  const events: LineageTimelineEvent[] = [];
  if (md.pushedAtMs) {
    events.push({ type: "pushed", atMs: Number(md.pushedAtMs), detail: md.jobId });
  }
  if (md.syncedAtMs || md[MEMORY_METADATA_KEYS.syncedAtMs]) {
    events.push({
      type: "synced",
      atMs: Number(md.syncedAtMs ?? md[MEMORY_METADATA_KEYS.syncedAtMs]),
      detail: row.walrusBlobId,
    });
  }
  if (md.mergedAtMs) {
    events.push({ type: "merged", atMs: Number(md.mergedAtMs), detail: md.mergedFrom });
  }
  if (md.deletedAtMs) {
    events.push({ type: "deleted", atMs: Number(md.deletedAtMs) });
  }
  return events;
}

function timelineFromRecord(row: MemoryRecord): LineageTimelineEvent[] {
  const stored = parseLineageHistory(row.metadata?.[MEMORY_METADATA_KEYS.lineageHistory]);
  const fromIndex = stored.map((e) => ({
    type: e.event,
    atMs: e.atMs,
    detail: e.detail ?? e.walrusBlobId ?? e.packId ?? e.parentMemoryId,
  }));
  if (fromIndex.length > 0) {
    return fromIndex.sort((a, b) => a.atMs - b.atMs);
  }
  const legacy = legacyEventsFromRecord(row);
  legacy.unshift({ type: "created", atMs: row.createdAtMs });
  return legacy.sort((a, b) => a.atMs - b.atMs);
}

export function buildLocalLineageGraph(
  row: MemoryRecord,
  namespaceRows: MemoryRecord[],
  opts?: { maxDepth?: number },
): LocalLineageGraph {
  const maxDepth = opts?.maxDepth ?? 8;
  const nodes = new Map<string, LineageGraphNode>();
  const edges: LineageGraphEdge[] = [];
  const seen = new Set<string>();

  const addMemoryNode = (record: MemoryRecord) => {
    nodes.set(nodeIdForMemory(record.id), memoryNodeFromRecord(record));
  };

  addMemoryNode(row);

  let current: MemoryRecord | undefined = row;
  let depth = 0;
  while (current && depth < maxDepth) {
    const parentId = readLineageParentId(current.metadata);
    if (!parentId || seen.has(parentId)) break;
    seen.add(parentId);
    const parent = namespaceRows.find((r) => r.id === parentId);
    if (!parent) break;
    addMemoryNode(parent);
    edges.push({
      from: nodeIdForMemory(parent.id),
      to: nodeIdForMemory(current.id),
      type: "parent",
    });
    current = parent;
    depth += 1;
  }

  for (const candidate of namespaceRows) {
    const parentId = readLineageParentId(candidate.metadata);
    if (parentId !== row.id) continue;
    addMemoryNode(candidate);
    edges.push({
      from: nodeIdForMemory(row.id),
      to: nodeIdForMemory(candidate.id),
      type: "child",
    });
  }

  const md = row.metadata ?? {};
  const rootMemoryId = readLineageRootId(md) ?? row.id;
  if (rootMemoryId !== row.id && !nodes.has(nodeIdForMemory(rootMemoryId))) {
    const rootRow = namespaceRows.find((r) => r.id === rootMemoryId);
    if (rootRow) {
      addMemoryNode(rootRow);
      edges.push({
        from: nodeIdForMemory(rootMemoryId),
        to: nodeIdForMemory(row.id),
        type: "parent",
      });
    }
  }

  if (row.synced && row.walrusBlobId) {
    edges.push({
      from: nodeIdForMemory(row.id),
      to: row.walrusBlobId,
      type: "promoted",
      atMs: md[MEMORY_METADATA_KEYS.promotedAtMs]
        ? Number(md[MEMORY_METADATA_KEYS.promotedAtMs])
        : row.updatedAtMs,
      detail: row.walrusBlobId,
    });
  }

  if (md.mergedFrom) {
    edges.push({
      from: md.mergedFrom,
      to: nodeIdForMemory(row.id),
      type: "merged",
      atMs: md.mergedAtMs ? Number(md.mergedAtMs) : undefined,
      detail: md.mergedFrom,
    });
  }

  const packId = md[MEMORY_METADATA_KEYS.packId];
  if (packId) {
    nodes.set(nodeIdForPack(packId), {
      id: nodeIdForPack(packId),
      kind: "pack",
      packId,
      memoryId: row.id,
      walrusBlobId: row.walrusBlobId,
    });
    edges.push({
      from: nodeIdForMemory(row.id),
      to: nodeIdForPack(packId),
      type: "promoted",
      detail: packId,
    });
  }

  return {
    nodes: [...nodes.values()],
    edges,
    events: timelineFromRecord(row),
    rootMemoryId,
    forkDepth: readForkDepth(md),
  };
}

export function mergeOnChainLineage(
  local: LocalLineageGraph,
  onChain: OnChainPackLineage,
): LineageGraphResult {
  const nodes = new Map<string, LineageGraphNode>();
  const edges: LineageGraphEdge[] = [...local.edges];

  for (const node of local.nodes) {
    nodes.set(node.id, node);
  }

  if (onChain.checked && onChain.packId) {
    const packNodeId = nodeIdForPack(onChain.packId);
    nodes.set(packNodeId, {
      id: packNodeId,
      kind: "pack",
      packId: onChain.packId,
      forkDepth: onChain.forkDepth,
    });

    if (onChain.parentPackId) {
      const parentNodeId = nodeIdForPack(onChain.parentPackId);
      nodes.set(parentNodeId, {
        id: parentNodeId,
        kind: "pack",
        packId: onChain.parentPackId,
      });
      edges.push({
        from: parentNodeId,
        to: packNodeId,
        type: "forked",
      });
    }

    if (onChain.rootPackId && onChain.rootPackId !== onChain.packId) {
      const rootNodeId = nodeIdForPack(onChain.rootPackId);
      nodes.set(rootNodeId, {
        id: rootNodeId,
        kind: "pack",
        packId: onChain.rootPackId,
      });
    }

    for (const ancestor of onChain.ancestors ?? []) {
      const ancestorId = nodeIdForPack(ancestor);
      if (!nodes.has(ancestorId)) {
        nodes.set(ancestorId, {
          id: ancestorId,
          kind: "pack",
          packId: ancestor,
        });
      }
    }
  }

  const rootId = onChain.rootPackId
    ? nodeIdForPack(onChain.rootPackId)
    : onChain.packId
      ? nodeIdForPack(onChain.packId)
      : nodeIdForMemory(local.rootMemoryId);

  return {
    nodes: [...nodes.values()],
    edges,
    rootId,
  };
}

export async function resolveLineageForRecord(deps: {
  local: LocalMemoryStore;
  row: MemoryRecord;
  namespace?: string;
  maxDepth?: number;
  includeOnChain?: boolean;
  readPackLineage?: (packId: string) => Promise<OnChainPackLineage>;
  durableLive: boolean;
}): Promise<LineageResult> {
  const namespace = deps.namespace ?? deps.row.namespace;
  const namespaceRows = await deps.local.recall({
    namespace,
    query: "",
    limit: LOCAL_MEMORY_RECALL_MAX,
  });

  const local = buildLocalLineageGraph(deps.row, namespaceRows, {
    maxDepth: deps.maxDepth,
  });

  const packId = deps.row.metadata?.[MEMORY_METADATA_KEYS.packId];
  const shouldCheckOnChain =
    deps.includeOnChain !== false && Boolean(packId && deps.readPackLineage);

  let onChain: OnChainPackLineage = {
    checked: false,
    live: Boolean(deps.readPackLineage),
    reasons: [],
  };

  if (shouldCheckOnChain && packId && deps.readPackLineage) {
    onChain = await deps.readPackLineage(packId);
  } else if (packId && !deps.readPackLineage) {
    onChain = {
      checked: true,
      live: false,
      packId,
      reasons: ["chain_reader_offline"],
    };
  } else if (!packId) {
    onChain = {
      checked: false,
      live: Boolean(deps.readPackLineage),
      reasons: ["no_pack_id"],
    };
  }

  const graph = mergeOnChainLineage(local, onChain);
  const verifiable = Boolean(deps.row.synced && deps.row.walrusBlobId);

  return {
    found: true,
    memoryId: deps.row.id,
    namespace,
    contentVersion: parseContentVersion(deps.row.metadata),
    walrusBlobId: deps.row.walrusBlobId,
    synced: deps.row.synced,
    verifiable,
    local,
    onChain,
    graph,
    durableLive: deps.durableLive,
  };
}
