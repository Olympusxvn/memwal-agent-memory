/** @deprecated Import from ./memory.js or ./sync.js — barrel for tests. */
export type { ToolRuntime } from "./memory.js";
export {
  handleGetLineage,
  handleGetStats,
  handleGetVersionHistory,
  handleRecall,
  handleRemember,
  handleSearch,
  handleVerify,
} from "./memory.js";
export { handleSoftDelete, handleSync } from "./sync.js";
