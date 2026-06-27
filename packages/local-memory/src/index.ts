export { scoreSnippet, scoreQuality } from "./quality-scorer.js";
export {
  resolvePromoteMode,
  scoreUploadDecision,
  shouldUploadToWalrus,
  type PromoteMode,
  type UploadDecision,
} from "./upload-decision.js";
export { scoreSemanticMatch } from "./semantic-score.js";
export { redactForUpstream } from "./redact.js";
export type { RedactForUpstreamResult } from "./redact.js";
export {
  applyRedactionToRecord,
  isLocallyRedacted,
  prepareRememberRecord,
} from "./apply-redaction.js";

export { LocalMemoryError, SqliteLocalStoreError } from "./errors.js";
export type { LocalMemoryErrorCode } from "./errors.js";

export { LocalMemoryStore, LOCAL_MEMORY_RECALL_MAX } from "./store/LocalMemoryStore.js";
export type { PruneParams, RecallParams, RememberOptions } from "./store/LocalMemoryStore.js";

export { InMemoryLocalMemoryStore } from "./store/in-memory-store.js";
export { SqliteLocalStore } from "./store/sqlite/SQLiteLocalStore.js";
export type { SQLiteLocalStoreOptions } from "./store/sqlite/SQLiteLocalStore.js";

export {
  createSharedLocalStore,
  sqliteNativeAvailable,
} from "./store/create-shared-local-store.js";
export type {
  CreateSharedLocalStoreOptions,
  SharedLocalStore,
} from "./store/create-shared-local-store.js";

export * from "./adapters/index.js";
