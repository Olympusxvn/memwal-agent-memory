# Hybrid search (1.1b)

Ranked memory discovery across **local SQLite** and **Walrus** — optimized for agent needs: fast, private, verifiable.

---

## Philosophy

```
Local (fast + private) → Redaction → Quality Gate → Walrus (durable + verifiable)
```

| Agent need | Search behavior |
|------------|-----------------|
| **Fast recall** | Local semantic rank first (no network unless needed) |
| **Privacy** | Local hits may contain pre-sync content; durable path is redacted at gate |
| **Persistence** | `forceDurable` hydrates from Walrus when local index is thin |
| **Trust** | `verifiable`, `contentHash`, optional `proof` on synced hits |

---

## API

MCP tool: `search`

Core method: `MemorySyncService.searchQuery(query, opts)`

---

## Algorithm

1. **Local rank** — scan namespace (up to 500 rows), score with `scoreSemanticMatch`, filter tombstones.
2. **Hydrate** — if durable is live and (`forceDurable` OR local hits < limit), query `durable.search`.
3. **Merge** — reconcile by `recordId` / `walrusBlobId` (same as `pullQuery`), re-score with optional distance boost.
4. **Return** — top-N hits sorted by score descending.

---

## Response fields

| Field | Description |
|-------|-------------|
| `score` | Relevance 0–1 (token overlap + phrase boost) |
| `hitSource` | `local` \| `durable` \| `hybrid` |
| `verifiable` | `true` when `synced && walrusBlobId` |
| `contentHash` | SHA-256 of content (trust anchor) |
| `proof` | MemoryProof JSON when `includeProof: true` and verifiable |

---

## When to use `search` vs `recall`

| Tool | Use when |
|------|----------|
| `search` | Agent needs **ranked discovery** — “find memories about X” |
| `recall` | Agent needs **context injection** — substring match + hydrate for prompts |

---

## Configuration

| Option | Default | Effect |
|--------|---------|--------|
| `limit` | 8 | Max hits (1–50) |
| `forceDurable` | false | Always query Walrus |
| `includeProof` | false | Attach proof JSON on verifiable hits |
| `minScore` (core) | 0.05 | Filter low-relevance noise |

---

## Example

```typescript
// MCP client
await client.callTool({
  name: "search",
  arguments: {
    semantic_query: "walrus hybrid architecture",
    limit: 5,
    forceDurable: true,
    includeProof: true,
  },
});
```

```json
{
  "source": "hybrid",
  "verifiableCount": 2,
  "hits": [
    {
      "id": "abc-123",
      "score": 0.91,
      "hitSource": "hybrid",
      "verifiable": true,
      "walrusBlobId": "0x...",
      "contentHash": "a1b2...",
      "proof": "{\"version\":\"1\",...}"
    }
  ]
}
```
