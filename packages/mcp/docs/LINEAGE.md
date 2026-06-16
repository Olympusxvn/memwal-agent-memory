# Lineage graph (1.1d)

The `getLineage` tool returns a **metadata-only** ancestry graph for a memory record. It never returns raw memory content (OpenSpec S-8).

---

## Layers

| Layer | Source | Contents |
|-------|--------|----------|
| **local** | SQLite metadata + namespace scan | Nodes, edges, timeline events |
| **onChain** | Sui RPC via `ChainReader.readPackLineage()` | Pack parent, root, fork depth, ancestors |
| **graph** | Merged view | Unified nodes/edges for visualization |

---

## Metadata contract

Stored in `MemoryRecord.metadata` (string map):

| Key | Meaning |
|-----|---------|
| `lineageParentId` | Prior memory id (legacy alias: `parentId`) |
| `lineageRootId` | Root of fork tree (self for originals) |
| `forkDepth` | Integer depth (0 = root) |
| `lineageHistory` | JSON array of timeline events |
| `packId` | On-chain MemoryPack object id (enables on-chain layer) |

Events appended automatically by `MemorySyncService`:

| Event | When |
|-------|------|
| `created` | First `remember()` |
| `edited` | Local content change |
| `promoted` | Successful `sync` / `pushOne` |
| `merged` | Durable pull merged into local row |

Utils live in `@memwalpp/shared` (`appendLineageEvent`, `parseLineageHistory`).

---

## Graph model

**Node ids**

- Memory: `mem:{memoryId}`
- Pack: `pack:{objectId}`

**Edge types**

| Type | Meaning |
|------|---------|
| `parent` | Ancestor memory → descendant |
| `child` | Parent → direct child memories in namespace |
| `promoted` | Memory → Walrus blob or pack id |
| `merged` | Durable source → local row |
| `forked` | Parent pack → child pack (on-chain) |

---

## Tool parameters

```jsonc
{
  "memoryId": "uuid",
  "includeOnChain": true,   // default: true when packId present
  "maxDepth": 8             // ancestor walk cap (matches Move MAX_FORK_DEPTH)
}
```

---

## On-chain reads

Requires `metadata.packId` and live Sui RPC (`SUI_NETWORK`, default `mainnet`).

Reads `memory_ext::PackExt` dynamic field on the pack object. v1 packs without extension return default lineage (`forkDepth: 0`, empty ancestors) — same as Move `default_lineage()`.

If `ChainReader` is offline but `packId` exists:

```jsonc
"onChain": { "checked": true, "live": false, "reasons": ["chain_reader_offline"] }
```

---

## Typical flow

```
remember → sync → getLineage
```

For verifiable memories, combine with:

```
verify({ memoryId, checkWalrus: true, checkOnChain: true })
```

---

## Implementation map

| Component | Path |
|-----------|------|
| Metadata utils | `packages/shared/src/lineage.ts` |
| Graph builder | `packages/core/src/memory/lineage-index.ts` |
| Service API | `MemorySyncService.getLineage()` |
| Sui reader | `packages/memwal-client/src/chain/chain-reader.ts` |
| MCP handler | `packages/mcp/src/tools/memory.ts` |

See also: [`TOOLS.md`](./TOOLS.md#getlineage-r)
