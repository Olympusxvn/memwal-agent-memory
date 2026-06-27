export type RecallSearchMode = "substring" | "fts" | "auto";

/** Resolve whether to use FTS-style AND token matching for this query. */
export function shouldUseFtsRecall(
  query: string,
  mode: RecallSearchMode = "auto",
  envFtsEnabled = process.env.MEMWAL_RECALL_FTS === "1",
): boolean {
  const q = query.trim();
  if (!q) return false;
  if (mode === "substring") return false;
  if (mode === "fts") return true;
  if (envFtsEnabled) return q.split(/\s+/).filter(Boolean).length >= 2;
  return q.split(/\s+/).filter(Boolean).length >= 2;
}

/** Tokenize for FTS AND matching (in-memory parity with SQLite FTS5 branch). */
export function ftsQueryTokens(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

export function matchFtsContent(content: string, query: string): boolean {
  const tokens = ftsQueryTokens(query);
  if (tokens.length === 0) return true;
  const hay = content.toLowerCase();
  return tokens.every((t) => hay.includes(t));
}

/** Build FTS5 MATCH expression (AND-joined quoted tokens). */
export function toFtsMatchExpression(query: string): string {
  const tokens = ftsQueryTokens(query);
  if (tokens.length === 0) return "";
  return tokens.map((t) => `"${t.replace(/"/g, '""')}"`).join(" AND ");
}
