import type { ToolRuntime } from "./memory.js";

export async function handleSync(
  rt: ToolRuntime,
  args: { forceDurable?: boolean; namespace?: string },
): Promise<Record<string, unknown>> {
  if (!rt.durable.isLive) {
    return {
      skipReason: "offline",
      metrics: { pushed: 0, skipped: 0, failed: 0, pulled: 0 },
    };
  }
  const namespace =
    args.namespace?.trim() || rt.config.defaultNamespace || "default";
  const metrics = args.forceDurable
    ? await rt.sync.fullSync({ namespace })
    : await rt.sync.syncPending({ namespace });
  return {
    metrics,
    namespace,
    durableLive: true,
    ...(metrics.pushed === 0 && metrics.failed === 0 && metrics.skipped > 0
      ? { hint: "Rows may be gated, tombstoned, or already synced" }
      : {}),
  };
}

export async function handleSoftDelete(
  rt: ToolRuntime,
  args: { memoryId: string; namespace?: string },
): Promise<Record<string, unknown>> {
  const namespace =
    args.namespace?.trim() || rt.config.defaultNamespace || "default";
  await rt.sync.softDelete(args.memoryId, { namespace });
  return { memoryId: args.memoryId, deleted: true };
}
