# MCP setup — MemWal Agent Memory

Connect **Cursor**, **Claude Desktop**, or any MCP client to the hybrid memory layer without importing `@memwalpp/*` packages.

**Judges:** fastest path is [`JUDGE_GUIDE.md`](../JUDGE_GUIDE.md#judge-mcp-quickstart-2-min) (`pnpm mcp:e2e`). Workshop context: [`judge-walrus-memory-workshop.md`](judge-walrus-memory-workshop.md).

---

## Integrate in 5 minutes

Minimal path for any MCP-compatible agent (Cursor, Claude Desktop, custom client).

| Step | Action | Time |
|------|--------|------|
| **1** | **Node 20+** installed | — |
| **2** | **No clone:** `npx -y @memwalpp/mcp@0.1.1 --transport stdio` — or clone repo + `pnpm install && pnpm mcp:build` | ~1 min |
| **3** | Add MCP server to client config (see [Cursor](#cursor-project-config) or [Claude Desktop](#claude-desktop)) | ~1 min |
| **4** | Restart client; confirm **10 tools** listed (`remember`, `recall`, `search`, `saveArtifact`, `verify`, …) | ~30 s |
| **5** | In chat: ask agent to **`remember`** a test phrase, then **`recall`** it — optional **`verify`** on the returned proof | ~2 min |

**Offline OK:** steps 2–5 work without `MEMWAL_*` keys (local SQLite only). Add keys from [`.env.example`](../.env.example) when you want live Walrus promote via `sync`.

**Monorepo verify (judges / CI):**

```bash
pnpm mcp:build && pnpm mcp:e2e
pnpm mcp:e2e:portable   # optional Path G — fresh store + verify PASS
```

**Walrus track map:** [`SUBMISSION.md` §3](../SUBMISSION.md) · [`docs/doc-map.html`](doc-map.html#track-map)

**MCP profiles (copy-paste):** [`packages/mcp/profiles/`](../packages/mcp/profiles/) — `cursor.json`, `claude-desktop.json`, `openclaw.json`

**Auto-capture alignment:** [`docs/auto-capture-hooks.md`](auto-capture-hooks.md)

---

**Product users (Cursor / Claude):** [`product/README.md`](product/README.md) — Pro Local vs + Walrus Sync.

**Agent setup skill:** `curl -sL https://memwalpp-dashboard.vercel.app/skills/setup` · [`docs/skills/setup.md`](skills/setup.md) · **Comparison:** [`Comparison.md`](../Comparison.md)

**Package docs:** [`packages/mcp/README.md`](../packages/mcp/README.md) · **Technical feedback:** [`FINAL_FEEDBACK.md`](../FINAL_FEEDBACK.md)

**npm (no clone):** [`@memwalpp/mcp@0.1.1`](https://www.npmjs.com/package/@memwalpp/mcp) · **Cursor plugin:** [cursor-plugin-memwal-agent-memory](https://github.com/Olympusxvn/cursor-plugin-memwal-agent-memory) (Marketplace review pending)

## Prerequisites

### Option A — npm / Cursor plugin (recommended for product users)

Node 20+. No monorepo clone required:

```bash
npx -y @memwalpp/mcp@0.1.1 --transport stdio
```

Or install the **Cursor Marketplace plugin** from [cursor-plugin-memwal-agent-memory](https://github.com/Olympusxvn/cursor-plugin-memwal-agent-memory) (local load or Marketplace listing when approved). Plugin `mcp.json` uses the same `npx` command.

### Option B — monorepo dev / judges

```bash
pnpm install
pnpm mcp:build    # compile packages/mcp → dist/
```

Optional (Walrus promote): set in `.env` or MCP server env:

- `MEMWAL_PRIVATE_KEY` — delegate key only (ADR-002)
- `MEMWAL_ACCOUNT_ID`
- `MEMWAL_SERVER_URL` / `MEMWAL_RELAYER_URL` (see [`.env.example`](../.env.example))

Optional (on-chain read layers for `verify` / `getLineage`):

- `SUI_NETWORK=mainnet` — read-only Sui RPC; no signing key required

Without MemWal keys, **local tools still work** (`remember`, `recall`, `search`, `getLineage`, `verify` local layer); `sync` returns `skipReason: "offline"`.

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
3. Confirm **memwal-agent-memory** shows green / nine tools listed.
4. In chat, ask the agent to call `remember` then `recall` for a test phrase.

### Cursor — npm or Marketplace plugin (no clone)

Add to `~/.cursor/mcp.json` or enable the [Cursor plugin](https://github.com/Olympusxvn/cursor-plugin-memwal-agent-memory):

```json
{
  "mcpServers": {
    "memwal-agent-memory": {
      "command": "npx",
      "args": ["-y", "@memwalpp/mcp@0.1.1", "--transport", "stdio"],
      "env": {
        "MEMWAL_NAMESPACE": "cursor",
        "MEMWAL_MCP_DATA_DIR": "${userHome}/.memwal-agent-memory/mcp"
      }
    }
  }
}
```

Fully restart Cursor after MCP config changes.

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

See [`packages/mcp/docs/HTTP.md`](../packages/mcp/docs/HTTP.md) for sessions, rate limits, and deployment.

## Verify E2E (CI / local)

```bash
pnpm mcp:e2e
pnpm --filter @memwalpp/mcp test
```

Runs stdio integration: `tools/list`, `remember` → `recall` → `sync` → redaction checks.

## Tool quick reference (v1 — 10 tools)

| Tool | Kind | HTTP auth | Notes |
|------|------|-----------|-------|
| `remember` | W | Required | Optional `redactLocal`; returns `proof` |
| `recall` | R | Optional | Hybrid `pullQuery` |
| `search` | R | Optional | Ranked hybrid search — `score`, `hitSource`, `verifiable` |
| `sync` | D | Required | Unskippable redaction + quality gate |
| `saveArtifact` | W | Required | JSON/markdown report with `artifact: true` metadata |
| `getVersionHistory` | R | Optional | Timeline from `metadata.versionHistory` |
| `getLineage` | R | Optional | Local graph + optional Sui pack lineage (metadata only) |
| `verify` | R | Optional | Layered: local / Walrus / on-chain |
| `softDelete` | W | Required | Tombstone row |
| `getStats` | R | Optional | Counts + `durableLive` |

Full schemas: [`packages/mcp/docs/TOOLS.md`](../packages/mcp/docs/TOOLS.md)

Deep dives:

- [`packages/mcp/docs/HYBRID-SEARCH.md`](../packages/mcp/docs/HYBRID-SEARCH.md)
- [`packages/mcp/docs/VERIFY.md`](../packages/mcp/docs/VERIFY.md)
- [`packages/mcp/docs/LINEAGE.md`](../packages/mcp/docs/LINEAGE.md)

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

Chain write tools (`createBounty`, …) are **not registered in MCP v1**. They remain in `apps/agent-swarm` / CLI for demos.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| MCP server fails to start | Run `pnpm mcp:build`; check `node packages/mcp/dist/cli.js` exists |
| No tools in Cursor | Reload MCP; check stderr in Cursor MCP logs |
| `skipReason: offline` on sync | Expected without MemWal env keys |
| Owner key error at startup | Remove `MEMWAL_OWNER_KEY` / `SUI_OWNER_PRIVATE_KEY`; use delegate only |
| HTTP 401 on remember/sync | Set `Authorization: Bearer` matching `MCP_HTTP_TOKEN` |

Spec: [`openspec-mcp-server.md`](specs/openspec-mcp-server.md)
