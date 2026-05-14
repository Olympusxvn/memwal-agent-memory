/** Heuristic local score — must not be shown as canonical until promoted via ADR-005 events. */
export function scoreSnippet(text: string): number {
  const len = text.trim().length;
  return Math.min(100, Math.max(0, Math.floor(len / 20)));
}

/**
 * Default quality gate: length + word density, capped at 100.
 * Still **non-authoritative** for marketplace UI (ADR-005).
 */
export function scoreQuality(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  const words = t.split(/\s+/).filter(Boolean).length;
  const len = t.length;
  const base = Math.min(70, Math.floor(len / 15));
  const bonus = Math.min(30, Math.floor(words / 3));
  return Math.min(100, Math.max(0, base + bonus));
}
