import type { SyncLogger } from "@memwalpp/core";
import { consoleSyncLogger } from "@memwalpp/core";

let correlation = 0;

export function nextCorrelationId(): string {
  correlation += 1;
  return `mcp-${Date.now()}-${correlation}`;
}

/** Logs tool name + ids only — never raw memory content (S-3). */
export function createMcpLogger(scope = "mcp"): SyncLogger {
  return consoleSyncLogger(scope);
}

export function logToolCall(
  logger: SyncLogger,
  tool: string,
  meta: Record<string, string | number | boolean | undefined>,
): void {
  logger.info(`tool=${tool}`, sanitizeLogFields(meta));
}

function sanitizeLogFields(
  meta: Record<string, string | number | boolean | undefined>,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}
