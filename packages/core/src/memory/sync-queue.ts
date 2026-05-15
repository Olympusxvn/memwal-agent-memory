import type { MemorySyncService } from "./memory-sync-service.js";

/** Optional in-memory queue; caller drives flush (no background thread). */
export class SyncQueue {
  private readonly pending = new Set<string>();
  private flushing = false;

  constructor(
    private readonly sync: MemorySyncService,
    private readonly defaultNamespace?: string,
  ) {}

  enqueue(recordId: string): void {
    if (!recordId.trim()) return;
    this.pending.add(recordId);
  }

  size(): number {
    return this.pending.size;
  }

  async flush(): Promise<{ processed: number; failed: number }> {
    if (this.flushing) {
      return { processed: 0, failed: 0 };
    }
    this.flushing = true;
    let processed = 0;
    let failed = 0;
    try {
      const ids = [...this.pending];
      this.pending.clear();
      for (const id of ids) {
        const result = await this.sync.pushOne(id, {
          namespace: this.defaultNamespace,
        });
        processed += 1;
        if (!result.pushed && result.reason === "error") {
          failed += 1;
          this.pending.add(id);
        }
      }
    } finally {
      this.flushing = false;
    }
    return { processed, failed };
  }
}
