import type { MemoryRecord } from "@memwalpp/shared";

/**
 * Shape inspired by [agentmemory](https://github.com/rohitg00/agentmemory) document stores.
 * In-repo only — no external npm dependency.
 */
export interface AgentmemoryStyleDoc {
  id: string;
  body: string;
  meta: Record<string, string>;
}

export function memoryRecordToAgentmemoryDoc(record: MemoryRecord): AgentmemoryStyleDoc {
  return {
    id: record.id,
    body: record.content,
    meta: { ...(record.metadata ?? {}), namespace: record.namespace },
  };
}

export function agentmemoryDocToMemoryRecord(
  doc: AgentmemoryStyleDoc,
  defaults: Pick<MemoryRecord, "createdAtMs" | "updatedAtMs" | "synced">,
): MemoryRecord {
  const { namespace, ...rest } = doc.meta;
  return {
    id: doc.id,
    namespace: namespace ?? "default",
    content: doc.body,
    createdAtMs: defaults.createdAtMs,
    updatedAtMs: defaults.updatedAtMs,
    synced: defaults.synced,
    metadata: rest,
  };
}
