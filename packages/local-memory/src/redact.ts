const EMAIL = /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi;
/** Loose NANP-style and digit runs (best-effort). */
const PHONE =
  /\b(?:\+?\d{1,3}[-.\s()]{0,3})?(?:\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\d{10,15})\b/g;
const SK_OPENAI = /\bsk-[A-Za-z0-9]{20,}\b/g;
const BEARER = /\bBearer\s+[A-Za-z0-9._\-]{20,}\b/gi;
const PEM_BLOCK = /-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/gi;
/** Raw long hex blobs (likely seeds/material) — not 64-char Sui ids in isolation. */
const LONG_HEX = /\b[0-9a-fA-F]{96,}\b/g;

export interface RedactForUpstreamResult {
  text: string;
  /** Machine-readable flags (e.g. `email`); extend as heuristics grow. */
  piiFlags: string[];
}

function applyStep(
  input: string,
  re: RegExp,
  replacement: string,
  flag: string,
  flags: string[],
): string {
  const next = input.replace(re, () => {
    if (!flags.includes(flag)) flags.push(flag);
    return replacement;
  });
  return next;
}

/**
 * Best-effort PII / secret strip before durable sync (ADR-010). Not a compliance guarantee.
 */
export function redactForUpstream(input: string): RedactForUpstreamResult {
  const piiFlags: string[] = [];
  let text = input;
  text = applyStep(text, EMAIL, "[redacted-email]", "email", piiFlags);
  text = applyStep(text, PHONE, "[redacted-phone]", "phone", piiFlags);
  text = applyStep(text, SK_OPENAI, "[redacted-secret]", "api_key_sk", piiFlags);
  text = applyStep(text, BEARER, "Bearer [redacted]", "bearer", piiFlags);
  text = applyStep(text, PEM_BLOCK, "[redacted-pem]", "pem_private_key", piiFlags);
  text = applyStep(text, LONG_HEX, "[redacted-hex]", "long_hex", piiFlags);
  return { text, piiFlags };
}
