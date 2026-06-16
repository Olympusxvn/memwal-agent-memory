const EMAIL = /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi;

/** NANP-style numbers with explicit separators (high confidence). */
const PHONE_FORMATTED =
  /\b(?:\+?\d{1,3}[-.\s()]{0,3})?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g;

/** Bare 10–11 digit runs — filtered to avoid UUID / timestamp / hash suffix false positives. */
const PHONE_BARE = /\b(?:\+1[-.\s]?)?\d{10,11}\b/g;

const UUID_RE =
  /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;

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

type Span = readonly [start: number, end: number];

function collectSpans(text: string, re: RegExp): Span[] {
  const spans: Span[] = [];
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    spans.push([m.index, m.index + m[0].length]);
  }
  return spans;
}

function overlapsSpan(start: number, end: number, spans: readonly Span[]): boolean {
  for (const [s, e] of spans) {
    if (start < e && end > s) return true;
  }
  return false;
}

function isInsideUuid(start: number, end: number, uuidSpans: readonly Span[]): boolean {
  return overlapsSpan(start, end, uuidSpans);
}

/** slug-1739723871234, e2e-sync-<millis> — id/timestamp suffixes, not phone numbers. */
function isIdOrTimestampSuffix(text: string, start: number, match: string): boolean {
  const digits = match.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) return false;
  if (start === 0) return false;
  const sep = text[start - 1];
  if (sep !== "-" && sep !== "_" && sep !== "/" && sep !== ":") return false;
  const prefix = text.slice(Math.max(0, start - 48), start - 1);
  if (!prefix || !/[a-zA-Z]/.test(prefix)) return false;
  return true;
}

/** hex hash token after separator, or long hex-only digit runs (32+). */
function isHashSuffix(text: string, start: number, match: string): boolean {
  const core = match.replace(/^\+/, "");
  if (!/^[0-9a-fA-F]+$/.test(core)) return false;
  if (core.length >= 32) return true;
  if (start > 0 && /[-_]/.test(text[start - 1]!) && core.length >= 16) return true;
  return false;
}

function shouldRedactBarePhone(
  text: string,
  match: string,
  start: number,
  uuidSpans: readonly Span[],
): boolean {
  const end = start + match.length;
  if (isInsideUuid(start, end, uuidSpans)) return false;
  if (isIdOrTimestampSuffix(text, start, match)) return false;
  if (isHashSuffix(text, start, match)) return false;
  return true;
}

function redactPhones(input: string, piiFlags: string[]): string {
  const uuidSpans = collectSpans(input, UUID_RE);

  let text = input.replace(PHONE_BARE, (match, offset) => {
    if (!shouldRedactBarePhone(input, match, offset, uuidSpans)) return match;
    if (!piiFlags.includes("phone")) piiFlags.push("phone");
    return "[redacted-phone]";
  });

  text = text.replace(PHONE_FORMATTED, () => {
    if (!piiFlags.includes("phone")) piiFlags.push("phone");
    return "[redacted-phone]";
  });

  return text;
}

/**
 * Best-effort PII / secret strip before durable sync (ADR-010). Not a compliance guarantee.
 */
export function redactForUpstream(input: string): RedactForUpstreamResult {
  const piiFlags: string[] = [];
  let text = input;
  text = applyStep(text, EMAIL, "[redacted-email]", "email", piiFlags);
  text = redactPhones(text, piiFlags);
  text = applyStep(text, SK_OPENAI, "[redacted-secret]", "api_key_sk", piiFlags);
  text = applyStep(text, BEARER, "Bearer [redacted]", "bearer", piiFlags);
  text = applyStep(text, PEM_BLOCK, "[redacted-pem]", "pem_private_key", piiFlags);
  text = applyStep(text, LONG_HEX, "[redacted-hex]", "long_hex", piiFlags);
  return { text, piiFlags };
}
