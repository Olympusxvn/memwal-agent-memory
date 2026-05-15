export interface SyncLogger {
  info(message: string, fields?: Record<string, string | number | boolean>): void;
  warn(message: string, fields?: Record<string, string | number | boolean>): void;
}

export const noopSyncLogger: SyncLogger = {
  info() {},
  warn() {},
};

export function consoleSyncLogger(prefix = "memwal-sync"): SyncLogger {
  return {
    info(message, fields) {
      const extra = fields ? ` ${JSON.stringify(fields)}` : "";
      console.info(`[${prefix}] ${message}${extra}`);
    },
    warn(message, fields) {
      const extra = fields ? ` ${JSON.stringify(fields)}` : "";
      console.warn(`[${prefix}] ${message}${extra}`);
    },
  };
}
