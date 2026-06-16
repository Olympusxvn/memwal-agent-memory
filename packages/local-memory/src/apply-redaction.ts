import type { MemoryRecord, RememberOptions } from "@memwalpp/shared";
import { MEMORY_METADATA_KEYS } from "@memwalpp/shared";

import type { RedactForUpstreamResult } from "./redact.js";

/** Apply redaction pipeline output onto a record (shared by local remember + sync push). */
export function applyRedactionToRecord(
  record: MemoryRecord,
  redacted: RedactForUpstreamResult,
  extraMetadata?: Record<string, string>,
): MemoryRecord {
  return {
    ...record,
    content: redacted.text,
    metadata: {
      ...(record.metadata ?? {}),
      ...extraMetadata,
      [MEMORY_METADATA_KEYS.redacted]: redacted.piiFlags.length > 0 ? "1" : "0",
      [MEMORY_METADATA_KEYS.piiFlags]: redacted.piiFlags.join(","),
    },
  };
}

export function prepareRememberRecord(
  redact: (text: string) => RedactForUpstreamResult,
  record: MemoryRecord,
  opts?: RememberOptions,
): MemoryRecord {
  if (opts?.redactLocal !== true) return record;
  const redacted = redact(record.content);
  return applyRedactionToRecord(record, redacted, {
    [MEMORY_METADATA_KEYS.redactLocal]: "1",
  });
}

export function isLocallyRedacted(record: MemoryRecord): boolean {
  const v = record.metadata?.[MEMORY_METADATA_KEYS.redactLocal];
  return v === "1" || v === "true";
}
