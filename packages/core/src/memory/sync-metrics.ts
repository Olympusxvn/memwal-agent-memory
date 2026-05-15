export interface SyncMetrics {
  pushed: number;
  skipped: number;
  failed: number;
  pulled: number;
}

export function emptySyncMetrics(): SyncMetrics {
  return { pushed: 0, skipped: 0, failed: 0, pulled: 0 };
}

export function mergeSyncMetrics(a: SyncMetrics, b: SyncMetrics): SyncMetrics {
  return {
    pushed: a.pushed + b.pushed,
    skipped: a.skipped + b.skipped,
    failed: a.failed + b.failed,
    pulled: a.pulled + b.pulled,
  };
}
