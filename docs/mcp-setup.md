# MCP setup — MemWal Agent Memory

Connect **Cursor**, **Claude Desktop**, or any MCP client to the hybrid memory layer without importing `@memwalpp/*` packages.

**Judges:** fastest path is [`JUDGE_GUIDE.md`](../JUDGE_GUIDE.md#judge-mcp-quickstart-2-min) (`pnpm mcp:e2e`). Workshop context: [`judge-walrus-memory-workshop.md`](judge-walrus-memory-workshop.md).

**Product users (Cursor / Claude):** start at [`product/README.md`](product/README.md) — Pro Local vs + Walrus Sync, smoke test, deeplink.

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

Chain tools (`createBounty`, `fulfillBounty`, `listMemoryPack`, `buyMemoryPack`, `forkMemory`) need a **delegate** key. Without it they return `{ skipReason: "chain_not_configured" }` — expected for judges.

## Mainnet object IDs (v1 + v2)

Canonical source: [`packages/shared/src/deployed-package.ts`](../packages/shared/src/deployed-package.ts) and [`.env.example`](../.env.example).

| Field | Object ID | Use |
|-------|-----------|-----|
| Package (original, WAL type, explorer) | `0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050` | Suiscan links, `wal::WAL` coin type |
| Package (published-at v3, PTB targets) | `0x9de4c63e976b5244fc7a5378134c9a87030ef534491f8a6919698e7379a2b711` | `moveTarget()` / v2 entrypoints |
| Marketplace v1 (shared) | `0x7dea19c34022cc7d28d21bfef75859bd6704f8fbd9bc7ea00c787052f895d548` | v1 list/buy PTBs |
| WAL TreasuryCap | `0xb9ee4a8bab47624f8ec343fd079c51fb54be60a8671affc7961da6e45badc41e` | Demo WAL mint / escrow |
| **Config v2** (shared) | `0x52ea5aa40b38de760c3faa08bd83cd047e4d63023091f14774a8a87609f0ecd1` | Fee bps, pause flag |
| **MarketplaceV2** (shared) | `0xfaddc1f4fe0f82a84d885b47a1202e37dc8f0a87040a7df7ff3e4268566c488f` | v2 list/buy, MemoryPack |
| Bootstrap tx | `BjV2Q8mCarkmtENT1T3SPncKAFP3qNHQKVJ2DgptUnkW` | v2 state on mainnet |

**Dual package-id rule:** PTBs use **published-at**; WAL coin type uses **original** package id.

MCP chain client **defaults** v1/v2 object IDs from `deployed-package.ts` when env vars are omitted. Override only for another network.

## Chain tools (optional)

```bash
# .env or MCP server env — delegate only (ADR-002); never commit
SUI_DELEGATE_PRIVATE_KEY=   # ed25519 hex
SUI_NETWORK=mainnet

# Optional overrides (defaults match mainnet bootstrap above)
MARKETPLACE_PACKAGE_PUBLISHED_AT=0x9de4c63e976b5244fc7a5378134c9a87030ef534491f8a6919698e7379a2b711
MARKETPLACE_OBJECT_ID=0x7dea19c34022cc7d28d21bfef75859bd6704f8fbd9bc7ea00c787052f895d548
WAL_TREASURY_CAP_ID=0xb9ee4a8bab47624f8ec343fd079c51fb54be60a8671affc7961da6e45badc41e
CONFIG_OBJECT_ID=0x52ea5aa40b38de760c3faa08bd83cd047e4d63023091f14774a8a87609f0ecd1
MARKETPLACE_V2_OBJECT_ID=0xfaddc1f4fe0f82a84d885b47a1202e37dc8f0a87040a7df7ff3e4268566c488f
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| MCP server fails to start | Run `pnpm mcp:build`; check `node packages/mcp/dist/cli.js` exists |
| No tools in Cursor | Reload MCP; check stderr in Cursor MCP logs |
| `skipReason: offline` on promote | Expected without MemWal env keys |
| Owner key error at startup | Remove `MEMWAL_OWNER_KEY` / `SUI_OWNER_PRIVATE_KEY`; use delegate only |

Spec: [`openspec-mcp-server.md`](specs/openspec-mcp-server.md)
