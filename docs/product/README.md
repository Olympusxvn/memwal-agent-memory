# MemWal MCP — Product guide (Cursor & Claude)

**Project memory for AI assistants.** Local-first by default; optional Walrus backup via [MemWal](https://docs.memwal.ai/).

**Live intro:** https://memwalpp-dashboard.vercel.app/product

> Hackathon / judges: use [`JUDGE_GUIDE.md`](../../JUDGE_GUIDE.md) and root [`README.md`](../../README.md) instead.

---

## Choose your tier

| | **Pro Local** (default) | **+ Walrus Sync** (optional) |
|---|-------------------------|------------------------------|
| **Needs** | Node 20+ only | + MemWal delegate key, account ID, relayer URL |
| **Storage** | SQLite on your machine (`~/.memwal-agent-memory/mcp`) | Same local + encrypted blobs on Walrus |
| **Offline** | Full `remember` / `recall` / `search` | Local works offline; promote needs network |
| **Privacy** | Data stays on device | Redaction + quality gate **before** MemWal upload |
| **Best for** | Daily Cursor / Claude coding | Backup, second machine, team durable layer |

Chain marketplace tools are **not** part of this product guide — see [`docs/deploy.md`](../deploy.md) for operators.

---

## Quick start — Pro Local

### Cursor (recommended)

1. Clone and open this repo in Cursor (ships [`.cursor/mcp.json`](../../.cursor/mcp.json)), **or** add global MCP config (below).
2. Run once:

```bash
pnpm install && pnpm mcp:build
```

3. **Cursor → Settings → MCP** → enable `memwal-agent-memory` (green).
4. Enable rule [`.cursor/rules/memwal-mcp-product.mdc`](../../.cursor/rules/memwal-mcp-product.mdc) (or copy into your project).
5. In chat:

> Remember: "API uses published-at package id for PTBs, original id for WAL coin type."
> Then recall: "Sui package id rules"

### Claude Desktop

1. Clone repo; run `pnpm install && pnpm mcp:build`.
2. Merge [`docs/examples/claude_desktop_config.json`](../examples/claude_desktop_config.json) into your Claude config — set absolute repo path.
3. Paste [`claude-instructions.md`](claude-instructions.md) into **Project instructions**.
4. Restart Claude Desktop; confirm MCP tools appear.

### Verify (no keys)

```bash
pnpm mcp:e2e
```

Exit code `0` = server OK.

---

## + Walrus Sync

Add to MCP server `env` (never commit keys):

```bash
MEMWAL_PRIVATE_KEY=...      # delegate only
MEMWAL_ACCOUNT_ID=...
MEMWAL_SERVER_URL=https://...
```

Then use MCP tools with `promote: true` on `remember`, or call `sync` / `promote`. See [MemWal quick start](https://docs.memwal.ai/) and [`.env.example`](../../.env.example).

---

## Install methods

| Method | Status | Command / path |
|--------|--------|----------------|
| **Open repo in Cursor** | Available now | `.cursor/mcp.json` + `pnpm mcp:build` |
| **Clone + Claude config** | Available now | [`claude_desktop_config.json`](../examples/claude_desktop_config.json) |
| **`npx @memwalpp/mcp`** | Planned ([npm-publish.md](npm-publish.md)) | `npx -y @memwalpp/mcp --transport stdio` |

---

## Cursor one-click install

Requires repo cloned and `pnpm mcp:build` once. Open this project in Cursor before using `${workspaceFolder}`.

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=memwal-agent-memory&config=eyJjb21tYW5kIjoibm9kZSIsImFyZ3MiOlsiJHt3b3Jrc3BhY2VGb2xkZXJ9L3BhY2thZ2VzL21jcC9kaXN0L2NsaS5qcyIsIi0tdHJhbnNwb3J0Iiwic3RkaW8iXSwiZW52Ijp7Ik1FTVdBTF9OQU1FU1BBQ0UiOiJjdXJzb3IiLCJNRU1XQUlfTVBDX0RBVEFfRElSIjoiJHt1c2VySG9tZX0vLm1lbXdhbC1hZ2VudC1tZW1vcnltL21jcCJ9fQ==)

Global config template (`~/.cursor/mcp.json`) after **npm publish**:

```json
{
  "mcpServers": {
    "memwal-agent-memory": {
      "command": "npx",
      "args": ["-y", "@memwalpp/mcp", "--transport", "stdio"],
      "env": {
        "MEMWAL_NAMESPACE": "cursor",
        "MEMWAL_MCP_DATA_DIR": "${userHome}/.memwal-agent-memory/mcp"
      }
    }
  }
}
```

---

## Global Cursor config (clone path, any project)

```json
{
  "mcpServers": {
    "memwal-agent-memory": {
      "command": "node",
      "args": ["C:/path/to/memwal-agent-memory/packages/mcp/dist/cli.js", "--transport", "stdio"],
      "env": {
        "MEMWAL_NAMESPACE": "cursor",
        "MEMWAL_MCP_DATA_DIR": "${userHome}/.memwal-agent-memory/mcp"
      }
    }
  }
}
```

Use your absolute clone path. Run `pnpm mcp:build` after pulling MCP changes.

---

## Test phrase (smoke)

Use in Cursor or Claude after MCP is green:

1. **Remember:** `Product smoke test 2026 — namespace cursor, hybrid memory OK.`
2. **Recall:** `Product smoke test 2026`

Expected: recall returns the stored phrase (JSON text from MCP tool).

---

## Docs map

| Doc | Use |
|-----|-----|
| **Live intro** | https://memwalpp-dashboard.vercel.app/product |
| [landing.html](landing.html) | Repo copy (same content) |
| [claude-instructions.md](claude-instructions.md) | Paste into Claude project |
| [e2e-matrix.md](e2e-matrix.md) | QA: Windows + macOS × clients |
| [npm-publish.md](npm-publish.md) | Ship `npx @memwalpp/mcp` |
| [mcp-setup.md](../mcp-setup.md) | Technical MCP reference |
| [openspec-product-mvp-cursor-claude.md](../specs/openspec-product-mvp-cursor-claude.md) | Full MVP spec |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No MCP tools | `pnpm mcp:build`; reload MCP in Cursor |
| Empty recall | Wrong namespace — set `MEMWAL_NAMESPACE` consistently |
| `skipReason: offline` on promote | Pro Local only — add MemWal env for Walrus |
| Owner key error | Use delegate key only ([ADR-002](../decisions/ADR-002.md)) |
