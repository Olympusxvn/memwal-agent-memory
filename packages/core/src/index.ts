export * from "./memory/outcome-bridge.js";
export {
  createMemorySyncService,
  type MemorySyncService,
  type MemorySyncServiceDeps,
  type PushOneResult,
  type PushSkipReason,
} from "./memory/memory-sync-service.js";
export type { ConflictStrategy, MemorySyncConfig, PullQueryOpts } from "./memory/sync-config.js";
export { resolveSyncConfig } from "./memory/sync-config.js";
export { SyncQueue } from "./memory/sync-queue.js";
export { SyncError, type SyncErrorCode } from "./memory/sync-errors.js";
export type { SyncLogger } from "./memory/sync-logger.js";
export { consoleSyncLogger, noopSyncLogger } from "./memory/sync-logger.js";
export type { SyncMetrics } from "./memory/sync-metrics.js";
export { emptySyncMetrics, mergeSyncMetrics } from "./memory/sync-metrics.js";
export {
  allowUpstream,
  isTombstone,
  mergeDurableHitIntoRecord,
} from "./memory/merge.js";
export {
  MemWalAgentBridge,
  createMemWalAgentBridge,
  type MemWalAgentBridgeDeps,
} from "./agent/MemWalAgentBridge.js";
export {
  createMemWalSwarmHooks,
  extractRecallQuery,
  formatMemoryContext,
  type MemWalSwarmHooks,
} from "./agent/memwal-swarm-hooks.js";
export type { AgentBridgeConfig, SwarmHookContext } from "./agent/types.js";
