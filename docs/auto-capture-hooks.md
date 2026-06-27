# Auto-capture hooks alignment (Phase 17 / Gap T2)

Maps **OpenClaw `oc-memwal`** patterns to this repo’s **`createMemWalSwarmHooks`** bridge — document-only until full plugin parity.

## OpenClaw (upstream)

| Hook | Typical use |
|------|-------------|
| `beforeRemember` | Inject hybrid context before agent writes |
| `afterThink` | Capture reasoning snippets |
| `onTaskComplete` | `syncPending` / promote batch |

Reference: [`walrus-memory-alignment.md`](../walrus-memory-alignment.md) § OpenClaw plugin alignment.

## MemWal Agent Memory (this repo)

| Hook | Implementation |
|------|------------------|
| `beforeRemember` | `packages/core/src/agent/memwal-agent-bridge.ts` — `pullQuery` + context inject |
| `afterThink` | Same bridge — optional local remember |
| `onTaskComplete` | `syncPending()` metrics logged |

Runnable demos:

```bash
pnpm agent:demo           # single-agent lifecycle
pnpm agent:shared-memory  # three-agent shared namespace
pnpm agent:resume-session  # day-2 recall stub (Phase 14)
```

## MCP auto-capture (Cursor / Claude)

Use MCP **`remember`** after tool rounds — no separate hook file required:

1. Copy a profile from [`packages/mcp/profiles/`](../packages/mcp/profiles/).
2. Set `MEMWAL_NAMESPACE` per project.
3. Optional: `MEMWAL_RECALL_FTS=1` for multi-token local recall.

Cursor rule snippet (optional):

```
After completing a non-trivial task, call MCP remember with a 1–2 sentence summary
and metadata { "source": "cursor-auto" }.
```

## Deferred

- Wiring OpenClaw plugin package directly (use official MemWal + this MCP server instead).
- `analyze()` / `ask()` facade — see alignment doc P2.
