# Tool reference

All tools return JSON text in MCP `content[0].text`. Schemas are enforced with Zod at registration time.

**Legend**: `[R]` read · `[W]` mutate · `[D]` durable

---

## remember `[W]`

Store content in local SQLite. Optionally redact before persist.

```jsonc
{
  "content": "string (max 8000)",
  "namespace": "optional string",
  "metadata": { "key": "value" },
  "redactLocal": false  // true = redact before SQLite write
}
```

**Returns**: `{ stored, recordId, proof, redactLocal, … }`

**Privacy**: Default redaction on `sync`. Set `redactLocal: true` for immediate local redaction.

**HTTP auth**: Required.

---

## recall `[R]`

Hybrid recall via `MemorySyncService.pullQuery` — local first, optional durable hydrate.

```jsonc
{
  "query": "search text",
  "options": {
    "namespace": "optional",
    "limit": 10,
    "forceDurable": false
  }
}
```

**Returns**: `{ hits: [...], source: "local" | "hybrid", … }`

**HTTP auth**: Optional.

---

## search `[R]`

**Hybrid ranked search (1.1b)** — local semantic rank + optional Walrus hydrate. See [`HYBRID-SEARCH.md`](./HYBRID-SEARCH.md).

```jsonc
{
  "semantic_query": "walrus bounty proof",
  "limit": 10,
  "namespace": "optional",
  "forceDurable": false,
  "includeProof": false
}
```

**Returns**: `{ hits, source, query, durableLive, verifiableCount }` — each hit includes `score`, `hitSource`, `verifiable`, `contentHash`.

**HTTP auth**: Optional.

---

## getLineage `[R]`

**Layered lineage graph (1.1d)** — local ancestry + optional Sui pack lineage. Returns metadata only (S-8), no raw content.

```jsonc
{
  "memoryId": "uuid",
  "includeOnChain": true,
  "maxDepth": 8
}
```

**Returns**:

```jsonc
{
  "found": true,
  "memoryId": "…",
  "contentVersion": "2",
  "walrusBlobId": "…",
  "verifiable": true,
  "local": {
    "nodes": [{ "id": "mem:…", "kind": "memory", "memoryId": "…" }],
    "edges": [{ "from": "mem:…", "to": "mem:…", "type": "parent" }],
    "events": [{ "type": "created", "atMs": 123 }],
    "rootMemoryId": "…",
    "forkDepth": 0
  },
  "onChain": {
    "checked": true,
    "live": true,
    "packId": "0x…",
    "parentPackId": "0x…",
    "rootPackId": "0x…",
    "forkDepth": 1,
    "ancestors": ["0x…"]
  },
  "graph": { "nodes": [], "edges": [], "rootId": "pack:0x…" }
}
```

On-chain reads use `ChainReader.readPackLineage()` via `metadata.packId` (`SUI_NETWORK`, default `mainnet`).

**HTTP auth**: Optional.

---

## getVersionHistory `[R]`

**Real version timeline (1.1e)** — local edits + Walrus promotions from `metadata.versionHistory` index.

```jsonc
{
  "memoryId": "uuid",
  "includeProof": false
}
```

**Returns**:

```jsonc
{
  "found": true,
  "memoryId": "...",
  "currentVersion": "2",
  "latestBlobId": "0x...",
  "verifiable": true,
  "versions": [
    {
      "version": "1",
      "source": "local",
      "event": "created",
      "contentHash": "sha256...",
      "updatedAtMs": 1730000000000
    },
    {
      "version": "2",
      "source": "durable",
      "event": "promoted",
      "walrusBlobId": "0x...",
      "jobId": "job-...",
      "promotedAtMs": 1730000001000,
      "synced": true,
      "proof": "{...}"
    }
  ],
  "durableLive": true
}
```

Each successful `sync`/`pushOne` appends a durable promotion entry. Local content edits append `edited` events.

**HTTP auth**: Optional.

---

## sync `[D]`

Promote pending local rows to Walrus. **Redaction + quality gate per row — unskippable.**

```jsonc
{
  "forceDurable": false,
  "namespace": "optional"
}
```

**Returns**: `{ pushed, skipped, results: [...] }`

Each result may include `skipReason` when quality gate rejects a row.

**HTTP auth**: Required.

---

## softDelete `[W]`

Tombstone a memory (`metadata.deleted=1`).

```jsonc
{
  "memoryId": "id",
  "namespace": "optional"
}
```

**Returns**: `{ deleted, memoryId }`

**HTTP auth**: Required.

---

## getStats `[R]`

Local row counts and durable connectivity.

```jsonc
{}
```

**Returns**: `{ local: { … }, durable: { live, … } }`

**HTTP auth**: Optional.

---

## verify `[R]`

Layered verification: local proof, optional Walrus blob check, optional Sui on-chain refs.

```jsonc
{
  "proof": "{\"version\":\"1\",\"memoryId\":\"…\",…}",  // optional if memoryId set
  "memoryId": "uuid",
  "checkWalrus": true,   // default true when blob id present
  "checkOnChain": false  // default true when packId/bountyId/txDigest in metadata
}
```

**Returns**:

```jsonc
{
  "valid": true,
  "memoryId": "…",
  "walrusBlobId": "…",
  "local": { "valid": true, "reasons": [], "synced": true, "contentHash": "…" },
  "walrus": { "checked": true, "live": true, "found": true, "valid": true, "reasons": [] },
  "onChain": {
    "checked": true,
    "live": true,
    "valid": true,
    "network": "mainnet",
    "packContainsBlob": true,
    "bountyReferencesBlob": true,
    "txFound": true,
    "txSuccess": true,
    "reasons": []
  }
}
```

On-chain reads use metadata keys `packId`, `bountyId`, `txDigest`, `fulfillmentTxDigest` via read-only Sui RPC (`SUI_NETWORK`, default `mainnet`).

**HTTP auth**: Optional.

---

## Forbidden parameters (all tools)

These keys are rejected on any tool input (`-32602`):

| Key | Reason |
|-----|--------|
| `skipRedaction`, `skip_redaction` | Cannot bypass redaction |
| `skipGate`, `skipQualityGate`, `bypassGate` | Cannot bypass quality gate |
| `bypassRedaction`, `bypassQualityGate` | Cannot bypass gates |
| `rawContent`, `unredacted`, `noRedact` | Cannot inject unredacted content |

---

## Typical agent flows

### Remember and recall (local)

```
remember → recall
```

### Promote to Walrus

```
remember → sync → recall (with forceDurable if needed)
```

### Verify durable proof

```
remember → sync → verify({ memoryId })
```

### Lineage and version audit

```
remember → sync → getVersionHistory → getLineage → verify({ memoryId, checkOnChain: true })
```

Deep dives: [`VERIFY.md`](./VERIFY.md) · [`LINEAGE.md`](./LINEAGE.md)

---

## Future tools (v2+)

Not registered in v1:

- `createBounty`, `buyMemoryPack`, `listMarketplace`, `forkMemory` (chain write PTBs)
- Postgres event indexer (schema: `docs/specs/indexer-schema.sql`)

See OpenSpec §5 marketplace section for planned surface.
