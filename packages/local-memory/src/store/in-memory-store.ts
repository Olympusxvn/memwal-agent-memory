import type { MemoryRecord } from "@memwalpp/shared";

import {
  LocalMemoryStore,
  type PruneParams,
  type RecallParams,
  type RememberOptions,
} from "./LocalMemoryStore.js";

export class InMemoryLocalMemoryStore extends LocalMemoryStore {
  private readonly rows = new Map<string, MemoryRecord>();

  async remember(record: MemoryRecord, opts?: RememberOptions): Promise<void> {
    LocalMemoryStore.assertNonEmptyId(record.id);
    LocalMemoryStore.assertNonEmptyNamespace(record.namespace);
    const row = this.prepareRememberRecord(record, opts);
    this.rows.set(record.id, { ...row });
  }

  async getById(id: string): Promise<MemoryRecord | undefined> {
    const r = this.rows.get(id);
    return r ? { ...r } : undefined;
  }

  async recall(params: RecallParams): Promise<MemoryRecord[]> {
    LocalMemoryStore.assertNonEmptyNamespace(params.namespace);
    const limit = LocalMemoryStore.clampRecallLimit(params.limit);
    const q = params.query.trim().toLowerCase();
    const out: MemoryRecord[] = [];
    for (const r of this.rows.values()) {
      if (r.namespace !== params.namespace) continue;
      if (q && !r.content.toLowerCase().includes(q)) continue;
      out.push({ ...r });
    }
    out.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
    return out.slice(0, limit);
  }

  async prune(params: PruneParams): Promise<number> {
    let deleted = 0;
    const ns = params.namespace?.trim();

    if (params.olderThanMs != null) {
      const threshold = params.olderThanMs;
      for (const [id, row] of this.rows) {
        if (row.updatedAtMs >= threshold) continue;
        if (ns && row.namespace !== ns) continue;
        this.rows.delete(id);
        deleted++;
      }
    }

    if (params.keepLatest != null && params.keepLatest >= 0) {
      const cap = params.keepLatest;
      const pool = [...this.rows.values()].filter((r) => !ns || r.namespace === ns);
      pool.sort((a, b) => a.updatedAtMs - b.updatedAtMs);
      const excess = pool.length - cap;
      if (excess > 0) {
        for (const row of pool.slice(0, excess)) {
          if (this.rows.delete(row.id)) deleted++;
        }
      }
    }

    return deleted;
  }
}
