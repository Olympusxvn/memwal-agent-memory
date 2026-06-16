# Layered verify (1.1c)

The `verify` tool checks whether a memory is **internally consistent** and optionally **anchored on Walrus and Sui**.

---

## Three layers

| Layer | Checks |
|-------|--------|
| **local** | `MemoryProof` JSON vs SQLite row — content hash, namespace, `walrusBlobId`, tombstone |
| **walrus** | Blob presence via `DurableMemoryStore.verifyBlob()` |
| **onChain** | Sui RPC — pack contains blob, bounty references blob, tx digest success |

Top-level `valid` is `true` only when all checked layers pass.

---

## Parameters

```jsonc
{
  "proof": "{...}",       // optional if memoryId provided
  "memoryId": "uuid",
  "checkWalrus": true,    // default true when blob id exists
  "checkOnChain": false   // default true when packId/bountyId/txDigest in metadata
}
```

If neither `proof` nor `memoryId` is provided, returns `{ valid: false, reasons: ["missing_memory_id_or_proof"] }`.

---

## MemoryProof format

```jsonc
{
  "version": "1",
  "memoryId": "uuid",
  "namespace": "default",
  "contentHash": "sha256-hex",
  "walrusBlobId": "optional",
  "issuedAtMs": 1730000000000
}
```

Issued by `remember` response (`proof` field) or `search` with `includeProof: true` on verifiable hits.

---

## Walrus layer behavior

When relayer/index cannot confirm blob existence:

```jsonc
"walrus": {
  "checked": true,
  "found": false,
  "reasons": ["walrus_index_unavailable"]
}
```

If the local row is `synced` and local proof is valid, verify may still report `walrus.valid: true` (graceful degradation until MemWal exposes canonical blob lookup).

---

## On-chain metadata keys

| Key | Used for |
|-----|----------|
| `packId` | `MemoryPack.blob_ids` contains `walrusBlobId` |
| `bountyId` | Fulfillment / submission blob match |
| `txDigest` | Transaction success on Sui |
| `fulfillmentTxDigest` | Preferred over `txDigest` when set |

**Env:** `SUI_NETWORK` (default `mainnet`). Read-only — no delegate key required.

---

## Typical flows

**After remember (local only)**

```
remember → verify({ proof })
```

**After sync (full hybrid path)**

```
remember → sync → verify({ memoryId, checkWalrus: true })
```

**With marketplace / bounty refs**

```
verify({ memoryId, checkOnChain: true })
```

---

## Implementation map

| Component | Path |
|-----------|------|
| Layer orchestration | `packages/core/src/memory/verify-memory.ts` |
| Service API | `MemorySyncService.verifyMemory()` |
| Sui reader | `ChainReader.verifyMemoryRefs()` |
| MCP handler | `packages/mcp/src/tools/memory.ts` |

See also: [`TOOLS.md`](./TOOLS.md#verify-r)
