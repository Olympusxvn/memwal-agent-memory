import type { MemWalConfig } from "@mysten-incubation/memwal";

/**
 * App-level MemWal settings (extends relayer config + wait policy).
 * `key` / `accountId` align with `MemWalConfig` from the Mysten SDK.
 */
export interface MemWalClientConfig extends MemWalConfig {
  /** When true, `remember` blocks until Walrus indexing completes (default false). */
  waitForRemember?: boolean;
}

function trimOrEmpty(v: string | undefined): string {
  return v?.trim() ?? "";
}

/**
 * Read MemWal settings from `process.env` (Node) or a provided map (tests).
 * Returns `null` if required vars are missing — use `tryCreateMemWalServiceFromEnv` for offline-safe handling.
 */
export function loadMemWalConfigFromEnv(
  env: Record<string, string | undefined> = typeof process !== "undefined"
    ? (process.env as Record<string, string | undefined>)
    : {},
): MemWalClientConfig | null {
  const key = trimOrEmpty(env.MEMWAL_PRIVATE_KEY);
  const accountId = trimOrEmpty(env.MEMWAL_ACCOUNT_ID);
  if (!key || !accountId) {
    return null;
  }
  const serverUrl = trimOrEmpty(env.MEMWAL_SERVER_URL) || undefined;
  const namespace = trimOrEmpty(env.MEMWAL_NAMESPACE) || "default";
  const waitRaw = trimOrEmpty(env.MEMWAL_WAIT_FOR_REMEMBER).toLowerCase();
  const waitForRemember = waitRaw === "1" || waitRaw === "true" || waitRaw === "yes";

  return {
    key,
    accountId,
    serverUrl,
    namespace,
    waitForRemember,
  };
}

export function assertMemWalConfig(config: MemWalClientConfig | null): asserts config is MemWalClientConfig {
  if (!config?.key || !config.accountId) {
    throw new Error("assertMemWalConfig: key and accountId are required");
  }
}
