import { tryCreateMemWalServiceFromEnv } from "./service.js";

export type { IMemWalAgent } from "./imemwal-agent.js";
export type { AgentHooks } from "./hooks.js";
export type { HookContext, OnChainOutcomeEvent } from "./types.js";

export { MemWalConfigError, isMemWalConfigError } from "./errors.js";
export type { MemWalClientConfig } from "./config.js";
export { loadMemWalConfigFromEnv, assertMemWalConfig } from "./config.js";
export type { MemWalService } from "./service.js";
export { createMemWalService, tryCreateMemWalServiceFromEnv } from "./service.js";

export type {
  MemWalConfig,
  RecallResult,
  RememberResult,
  RememberAcceptedResult,
} from "@mysten-incubation/memwal";

/**
 * @deprecated Use `tryCreateMemWalServiceFromEnv()` or `createMemWalService(config)`.
 * Lightweight ping for health checks only.
 */
export function createMemWalStub(): Promise<{ ping: () => string }> {
  const svc = tryCreateMemWalServiceFromEnv();
  return Promise.resolve({
    ping: () => (svc.isLive ? "memwal-client: live" : "memwal-client: offline (set MEMWAL_* env)"),
  });
}
