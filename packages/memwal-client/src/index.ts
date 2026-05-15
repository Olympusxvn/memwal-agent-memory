export type { IMemWalAgent } from "./imemwal-agent.js";
export type { AgentHooks } from "./hooks.js";
export type { HookContext, OnChainOutcomeEvent } from "./types.js";

export {
  MemWalConfigError,
  MemWalAuthError,
  MemWalTransportError,
  MemWalRateLimitError,
  isMemWalConfigError,
  isMemWalAuthError,
  isMemWalTransportError,
  shouldRetryMemWalError,
  wrapMemWalCallError,
} from "./errors.js";

export type { MemWalClientConfig } from "./config.js";
export { loadMemWalConfigFromEnv, assertMemWalConfig } from "./config.js";

export type { MemWalService, MemWalRecallHit } from "./service.js";
export { createMemWalService, tryCreateMemWalServiceFromEnv } from "./service.js";

export type {
  DurableMemoryStore,
  DurableRememberResult,
  DurableRecallHit,
  MemoryVersion,
  RememberOpts,
  RecallOpts,
  NamespaceOpts,
} from "./durable/types.js";
export {
  createDurableMemoryStore,
  durableOptionsFromConfig,
  applyRememberResult,
} from "./durable/durable-memory-store.js";

export { MemWalClient } from "./memwal-client.js";
export { withRetry } from "./retry.js";
export type { RetryOptions } from "./retry.js";

export type {
  MemWalConfig,
  RecallResult,
  RememberResult,
  RememberAcceptedResult,
} from "@mysten-incubation/memwal";

import { tryCreateMemWalServiceFromEnv } from "./service.js";

/**
 * @deprecated Use `MemWalClient.tryFromEnv()` or `tryCreateMemWalServiceFromEnv()`.
 */
export function createMemWalStub(): Promise<{ ping: () => string }> {
  const svc = tryCreateMemWalServiceFromEnv();
  return Promise.resolve({
    ping: () => (svc.isLive ? "memwal-client: live" : "memwal-client: offline (set MEMWAL_* env)"),
  });
}
