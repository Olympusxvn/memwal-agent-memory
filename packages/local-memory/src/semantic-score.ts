/** Token overlap + phrase boost — fast local semantic-ish ranking (ADR-005: non-authoritative until promoted). */

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length > 1);
}

/**
 * Score query ↔ content relevance in [0, 1].
 * Used by hybrid search (local rank + durable hydrate re-rank).
 */
export function scoreSemanticMatch(query: string, content: string): number {
  const qTokens = tokenize(query.trim());
  if (qTokens.length === 0) return 0;
  const cTokens = new Set(tokenize(content));
  let overlap = 0;
  for (const t of qTokens) {
    if (cTokens.has(t)) overlap += 1;
  }
  const tokenScore = overlap / qTokens.length;
  const qLower = query.trim().toLowerCase();
  const phraseBoost =
    qLower.length > 0 && content.toLowerCase().includes(qLower) ? 0.25 : 0;
  return Math.min(1, tokenScore + phraseBoost);
}
