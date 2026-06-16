/** Keys that must never appear in tool inputs (S-1 unskippable redaction/gate). */
const BYPASS_KEYS = new Set([
  "skipRedaction",
  "skip_redaction",
  "skipGate",
  "skip_gate",
  "skipQualityGate",
  "bypassRedaction",
  "bypassQualityGate",
  "bypassGate",
  "rawContent",
  "unredacted",
  "noRedact",
  "no_redact",
]);

export class McpValidationError extends Error {
  readonly code = -32602;

  constructor(message: string) {
    super(message);
    this.name = "McpValidationError";
  }
}

function scanObject(obj: Record<string, unknown>, path: string): void {
  for (const [key, value] of Object.entries(obj)) {
    if (BYPASS_KEYS.has(key)) {
      throw new McpValidationError(
        `Parameter "${path ? `${path}.` : ""}${key}" is not allowed — redaction and quality gate cannot be bypassed (S-1)`,
      );
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      scanObject(value as Record<string, unknown>, path ? `${path}.${key}` : key);
    }
  }
}

/** Reject any client attempt to bypass server-side redaction or quality gate. */
export function assertNoBypassFlags(args: Record<string, unknown>): void {
  scanObject(args, "");
}
