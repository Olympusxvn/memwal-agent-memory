# MCP setup — MemWal Agent Memory

Connect **Cursor**, **Claude Desktop**, or any MCP client to the hybrid memory layer without importing `@memwalpp/*` packages.

## Prerequisites

```bash
pnpm install
pnpm mcp:build    # compile packages/mcp → dist/
```

Optional (Walrus promote): set in `.env` or MCP server env:

- `MEMWAL_PRIVATE_KEY` — delegate key only (ADR-002)
- `MEMWAL_ACCOUNT_ID`
- `MEMWAL_SERVER_URL` (if required by your MemWal deployment)

Without keys, **local tools still work** (`remember`, `recall`, `search`); durable tools return `skipReason: "offline"`.

## Cursor (project config)

This repo ships [`.cursor/mcp.json`](../.cursor/mcp.json):

```json
{
  "mcpServers": {
    "memwal-agent-memory": {
      "command": "node",
      "args": ["packages/mcp/dist/cli.js", "--transport", "stdio"],
      "env": {
        "MEMWAL_NAMESPACE": "cursor",
        "MEMWAL_MCP_DATA_DIR": "${userHome}/.memwal-agent-memory/mcp"
      }
    }
  }
}
```

**Steps:**

1. Run `pnpm mcp:build` once (or after MCP code changes).
2. In Cursor: **Settings → MCP** → reload servers (or restart Cursor).
3. Confirm **memwal-agent-memory** shows green / tools listed.
4. In chat, ask the agent to call `remember` then `recall` for a test phrase.

**Dev mode** (no build, uses tsx):

```bash
pnpm mcp:dev -- --transport stdio
```

## Claude Desktop

Copy [`docs/examples/claude_desktop_config.json`](examples/claude_desktop_config.json) into your Claude config and replace `/ABSOLUTE/PATH/TO/memwal-agent-memory` with this repo path.

## HTTP (remote / OpenClaw)

```bash
MCP_TRANSPORT=http MCP_HTTP_PORT=8787 MCP_HTTP_TOKEN=your-secret pnpm mcp:start
```

Connect to `http://127.0.0.1:8787/mcp` with header `Authorization: Bearer your-secret`.

## Verify E2E (CI / local)

```bash
pnpm mcp:e2e
```

Runs `packages/mcp/test/e2e-stdio.test.ts`: spawns stdio server, `tools/list`, `remember` → `recall`, `getStats`.

## Tool quick reference

| Tool | Layer | Notes |
|------|-------|-------|
| `remember` | local (+ optional Walrus) | `promote: true` runs redaction + quality gate |
| `recall` | hybrid | Uses `MemorySyncService.pullQuery` |
| `search` | local only | Fast, no network |
| `sync` | durable | Promotes all pending rows |
| `getStats` | read | Row counts + `durableLive` |

Chain tools (`createBounty`, `fulfillBounty`, …) return `not_implemented` until Sprint S4.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| MCP server fails to start | Run `pnpm mcp:build`; check `node packages/mcp/dist/cli.js` exists |
| No tools in Cursor | Reload MCP; check stderr in Cursor MCP logs |
| `skipReason: offline` on promote | Expected without MemWal env keys |
| Owner key error at startup | Remove `MEMWAL_OWNER_KEY` / `SUI_OWNER_PRIVATE_KEY`; use delegate only |

Spec: [`openspec-mcp-server.md`](specs/openspec-mcp-server.md)
