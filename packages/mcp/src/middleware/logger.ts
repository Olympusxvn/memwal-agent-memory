import type { SyncLogger } from "@memwalpp/core";
import { consoleSyncLogger } from "@memwalpp/core";

let correlation = 0;

/** Field names that must never appear in MCP server logs (S-3). */
const FORBIDDEN_LOG_KEYS = new Set([
  "content",
  "text",
  "proof",
  "raw",
  "secret",
  "password",
  "privateKey",
  "private_key",
  "MEMWAL_PRIVATE_KEY",
]);

const EMAIL_IN_VALUE = /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i;
const SK_KEY_IN_VALUE = /\bsk-[A-Za-z0-9]{20,}\b/;

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

export function sanitizeLogFields(
  meta: Record<string, string | number | boolean | undefined>,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value === undefined) continue;
    if (FORBIDDEN_LOG_KEYS.has(key)) continue;
    if (typeof value === "string") {
      if (EMAIL_IN_VALUE.test(value) || SK_KEY_IN_VALUE.test(value)) {
        out[key] = "[redacted]";
        continue;
      }
      if (value.length > 200) {
        out[key] = `${value.slice(0, 80)}…`;
        continue;
      }
    }
    out[key] = value;
  }
  return out;
}

/** Extract safe identifiers from tool args for structured logging. */
export function safeToolMeta(args: Record<string, unknown>): Record<string, string | undefined> {
  const meta: Record<string, string | undefined> = {};
  if (typeof args.memoryId === "string") meta.memoryId = args.memoryId;
  if (typeof args.recordId === "string") meta.recordId = args.recordId;
  if (typeof args.namespace === "string") meta.namespace = args.namespace;
  const options = args.options;
  if (options && typeof options === "object" && "namespace" in options) {
    const ns = (options as { namespace?: unknown }).namespace;
    if (typeof ns === "string") meta.namespace = ns;
  }
  return meta;
}
