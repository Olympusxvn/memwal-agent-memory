export type ConflictStrategy = "durable_wins" | "local_wins" | "merge_metadata";

export interface MemorySyncConfig {
  /** Minimum scoreQuality (0–100) to promote (default 40). */
  qualityMin?: number;
  /** Smart upload threshold (0–100) for promote=auto (default 65, env MEMWAL_UPLOAD_THRESHOLD). */
  uploadThreshold?: number;
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
const DEFAULT_UPLOAD_THRESHOLD = 65;

export function resolveSyncConfig(
  config: MemorySyncConfig = {},
  env: Record<string, string | undefined> = typeof process !== "undefined"
    ? (process.env as Record<string, string | undefined>)
    : {},
): Required<
  Pick<MemorySyncConfig, "qualityMin" | "uploadThreshold" | "defaultNamespace" | "conflictStrategy">
> &
  MemorySyncConfig {
  const envMin = Number.parseInt(env.MEMWAL_SYNC_QUALITY_MIN?.trim() ?? "", 10);
  const envUpload = Number.parseInt(env.MEMWAL_UPLOAD_THRESHOLD?.trim() ?? "", 10);
  return {
    ...config,
    qualityMin:
      config.qualityMin ??
      (Number.isFinite(envMin) && envMin >= 0 ? envMin : DEFAULT_QUALITY_MIN),
    uploadThreshold:
      config.uploadThreshold ??
      (Number.isFinite(envUpload) && envUpload >= 0 ? envUpload : DEFAULT_UPLOAD_THRESHOLD),
    defaultNamespace:
      (config.defaultNamespace ?? env.MEMWAL_NAMESPACE?.trim()) || "default",
    conflictStrategy: config.conflictStrategy ?? "durable_wins",
    waitForPush: config.waitForPush,
  };
}
