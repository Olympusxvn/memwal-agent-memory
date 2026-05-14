import type { MemoryRecord } from "@memwalpp/shared";

/**
 * Shape inspired by episodic “memoir” segments ([memoirs](https://github.com/misaelzapata/memoirs)-style).
 * In-repo only — no external npm dependency.
 */
export interface MemoirsEpisodeStub {
  episodeId: string;
  summaryLine: string;
  occurredAtMs: number;
  namespace: string;
}

export function memoryRecordToMemoirsEpisode(record: MemoryRecord): MemoirsEpisodeStub {
  return {
    episodeId: record.id,
    summaryLine: record.content.slice(0, 280),
    occurredAtMs: record.createdAtMs,
    namespace: record.namespace,
  };
}

export function memoirsEpisodeToMemoryRecord(
  ep: MemoirsEpisodeStub,
  defaults: Pick<MemoryRecord, "updatedAtMs" | "synced"> & { content?: string },
): MemoryRecord {
  return {
    id: ep.episodeId,
    namespace: ep.namespace,
    content: defaults.content ?? ep.summaryLine,
    createdAtMs: ep.occurredAtMs,
    updatedAtMs: defaults.updatedAtMs,
    synced: defaults.synced,
    metadata: { source: "memoirs-adapter" },
  };
}
