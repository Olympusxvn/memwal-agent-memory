export type ConflictStrategy = "durable_wins" | "local_wins" | "merge_metadata";

export interface MemorySyncConfig {
  /** Minimum scoreQuality (0–100) to promote (default 40). */
  qualityMin?: number;
  defaultNamespace?: string;
  conflictStrategy?: ConflictStrategy;
  /** Passed to durable.remember wait option when pushing. */
  waitForPush?: boolean;
}

export interface PullQueryOpts {
  namespace?: string;
  limit?: number;
  /** When true, always query durable even if local hits exist. */
  forceDurable?: boolean;
}

const DEFAULT_QUALITY_MIN = 40;

export function resolveSyncConfig(
  config: MemorySyncConfig = {},
  env: Record<string, string | undefined> = typeof process !== "undefined"
    ? (process.env as Record<string, string | undefined>)
    : {},
): Required<Pick<MemorySyncConfig, "qualityMin" | "defaultNamespace" | "conflictStrategy">> &
  MemorySyncConfig {
  const envMin = Number.parseInt(env.MEMWAL_SYNC_QUALITY_MIN?.trim() ?? "", 10);
  return {
    ...config,
    qualityMin:
      config.qualityMin ??
      (Number.isFinite(envMin) && envMin >= 0 ? envMin : DEFAULT_QUALITY_MIN),
    defaultNamespace:
      (config.defaultNamespace ?? env.MEMWAL_NAMESPACE?.trim()) || "default",
    conflictStrategy: config.conflictStrategy ?? "durable_wins",
    waitForPush: config.waitForPush,
  };
}
