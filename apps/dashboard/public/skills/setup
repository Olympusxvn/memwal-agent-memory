# MemWal Agent Memory MCP Setup

This page is meant to be read by an AI client.

If you are reading it yourself, paste this into your AI client instead:

```text
Run `curl -sL https://memwalpp-dashboard.vercel.app/skills/setup` and use the
returned instructions to connect MemWal Agent Memory (@memwalpp/mcp) to this
AI client.
```

The AI client should either configure MemWal Agent Memory automatically, or give
the user the exact config and terminal commands to run.

**Comparison with official Walrus Memory MCP:** see
[`Comparison.md`](https://github.com/Olympusxvn/memwal-agent-memory/blob/main/Comparison.md)
or `curl -sL https://memory.walrus.xyz/skills/setup` for the official product.

## Agent Goal

Connect **`@memwalpp/mcp`** (server name: `memwal-agent-memory`) to the user's
AI client, choose **Pro Local** or **+ Walrus Sync**, and verify that memory
tools work.

Do not install extra packages or edit application source code unless the user
explicitly asks for developer integration.

## Setup Rules

1. **Choose tier first**
   - **Pro Local (default):** Node 20+ only. Local SQLite at
     `~/.memwal-agent-memory/mcp`. No Walrus keys required.
   - **+ Walrus Sync (optional):** Same as Pro Local, plus MemWal delegate
     credentials in MCP server `env` for `sync` / durable promote.
2. Identify the AI client: Cursor, Claude Desktop, Claude Code, Codex, or
   other local MCP app. Every local client uses the **Local MCP Server**
   section below.
3. Decide whether you have local shell and filesystem access.
4. If you can edit local user config files, do the setup yourself after showing
   the config you will add.
5. If you cannot edit local files yourself, prefer giving the user **ONE**
   terminal command to paste over raw JSON to hand-edit. Fall back to a config
   block only when no command exists; then state the exact file path and merge
   the `memwal-agent-memory` entry — never replace the whole file.
6. Preserve existing MCP servers. Merge `memwal-agent-memory`; do not replace
   the whole config.
7. Never print or expose values from `MEMWAL_PRIVATE_KEY`, `.env`, or
   `~/.memwal/credentials.json`.
8. Tell the user to fully quit and reopen the AI client after config changes.
9. Stop at the first real blocker and report the exact failure.
10. Keep the final status short. Do not repeat full config blocks after setup
    succeeds unless the user must copy/paste them manually.

## Requirements

For all tiers, check Node.js:

```bash
node -v
```

MemWal Agent Memory MCP requires **Node.js 20 or newer**. If Node is missing or
older than 20, ask the user to install Node.js 20+ from https://nodejs.org/
and stop.

### Pro Local

- Node 20+
- Clone of [memwal-agent-memory](https://github.com/Olympusxvn/memwal-agent-memory)
  **or** `npx -y @memwalpp/mcp@0.1.0 --transport stdio` ([npm](https://www.npmjs.com/package/@memwalpp/mcp))
- One-time build: `pnpm install && pnpm mcp:build` (monorepo clone path)

### + Walrus Sync (optional)

Add to MCP server `env` (delegate key only — never owner key):

| Variable | Example |
|----------|---------|
| `MEMWAL_PRIVATE_KEY` | delegate private key |
| `MEMWAL_ACCOUNT_ID` | MemWal account id |
| `MEMWAL_SERVER_URL` | `https://relayer.memory.walrus.xyz` |

**Credential source options:**

1. User already signed in with official Walrus Memory — have them open
   `~/.memwal/credentials.json` **themselves** and paste `delegatePrivateKey` and
   `accountId` into MCP env (you must not read or print that file).
2. Official terminal login (writes the same file):

   ```bash
   npx -y @mysten-incubation/memwal-mcp login --prod
   ```

3. Copy values from project `.env` (never commit keys).

Without Walrus env, **Pro Local still works**; `sync` returns
`skipReason: "offline"`.

## Recommended Build (monorepo clone)

When the user cloned this repository, run once from the repo root:

```bash
pnpm install && pnpm mcp:build
```

Verify offline-safe integration:

```bash
pnpm mcp:e2e
```

Exit code `0` means the MCP server is healthy (mock durable layer in CI).

## Local MCP Server

Use **stdio** for local MCP clients.

**If repo is open in Cursor** (project config — preferred for contributors):

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

**Global config** (any project — replace `REPO_ROOT` with absolute clone path):

```json
{
  "mcpServers": {
    "memwal-agent-memory": {
      "command": "node",
      "args": ["REPO_ROOT/packages/mcp/dist/cli.js", "--transport", "stdio"],
      "env": {
        "MEMWAL_NAMESPACE": "cursor",
        "MEMWAL_MCP_DATA_DIR": "${userHome}/.memwal-agent-memory/mcp"
      }
    }
  }
}
```

**+ Walrus Sync** — merge into the same `env` block:

```json
"MEMWAL_PRIVATE_KEY": "<delegate-key>",
"MEMWAL_ACCOUNT_ID": "<account-id>",
"MEMWAL_SERVER_URL": "https://relayer.memory.walrus.xyz"
```

**npm (published):**

```bash
npx -y @memwalpp/mcp@0.1.0 --transport stdio
```

**Cursor Marketplace plugin:** [cursor-plugin-memwal-agent-memory](https://github.com/Olympusxvn/cursor-plugin-memwal-agent-memory) (application submitted; listing pending).

### Cursor

Edit `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project) and merge
the JSON above.

Run `pnpm mcp:build` after pulling MCP changes.

### Claude Desktop

Edit:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Merge the global JSON block. Example using `pnpm` from repo root:

```json
{
  "mcpServers": {
    "memwal-agent-memory": {
      "command": "pnpm",
      "args": ["--dir", "REPO_ROOT", "mcp:start", "--", "--transport", "stdio"],
      "env": {
        "MEMWAL_NAMESPACE": "claude-desktop",
        "MEMWAL_MCP_DATA_DIR": "${HOME}/.memwal-agent-memory/mcp"
      }
    }
  }
}
```

### Codex

Edit `~/.codex/config.toml` and merge:

```toml
[mcp_servers.memwal-agent-memory]
command = "node"
args = ["REPO_ROOT/packages/mcp/dist/cli.js", "--transport", "stdio"]

[mcp_servers.memwal-agent-memory.env]
MEMWAL_NAMESPACE = "codex"
MEMWAL_MCP_DATA_DIR = "${HOME}/.memwal-agent-memory/mcp"
```

If Codex starts MCP servers from a monorepo root and paths break, set `cwd` to
the user's home directory or use the absolute `cli.js` path.

### Claude Code

```bash
claude mcp add --scope user memwal-agent-memory -- node REPO_ROOT/packages/mcp/dist/cli.js --transport stdio
```

Verify:

```bash
claude mcp list
```

### Other Local MCP Clients

Add an MCP server with:

- name: `memwal-agent-memory`
- command: `node`
- args: `["REPO_ROOT/packages/mcp/dist/cli.js", "--transport", "stdio"]`
- env: `MEMWAL_NAMESPACE`, `MEMWAL_MCP_DATA_DIR` (and optional Walrus vars)

## Streamable HTTP (self-hosted remote)

For remote agents or OpenClaw-style deployments, run the server locally or on
a VM:

```bash
MCP_TRANSPORT=http \
MCP_HTTP_PORT=8787 \
MCP_HTTP_TOKEN="$(openssl rand -hex 32)" \
pnpm --filter @memwalpp/mcp start
```

Client URL: `http://127.0.0.1:8787/mcp` with header
`Authorization: Bearer <token>`.

This is **not** the official relayer Remote MCP path. See
[`packages/mcp/docs/HTTP.md`](https://github.com/Olympusxvn/memwal-agent-memory/blob/main/packages/mcp/docs/HTTP.md).

## Verify Setup

After config + restart, ask:

```text
What MCP tools do you have available?
```

Expected **MemWal Agent Memory** tools (nine):

- `remember`
- `recall`
- `search`
- `sync`
- `getVersionHistory`
- `getLineage`
- `verify`
- `softDelete`
- `getStats`

### Pro Local smoke test

```text
Use remember to save: "MemWal Agent Memory setup verification succeeded."
Then use recall to search for: "setup verification succeeded"
```

Use a consistent namespace via `MEMWAL_NAMESPACE` (e.g. `setup-verification`).

### + Walrus Sync smoke test

After Pro Local smoke test succeeds:

```text
Use sync to promote pending memories, then search with includeProof if supported.
Use verify on the memoryId with checkWalrus true when credentials are configured.
```

If `sync` returns `skipReason: "offline"`, Walrus env is missing or relayer is
unreachable — user is still on Pro Local only.

## Hybrid workflow (important)

Unlike official Walrus Memory MCP, durable Walrus storage is **not automatic**:

```
remember → (optional redactLocal) → local SQLite
sync     → redact + quality gate → Walrus promote
search / verify / getLineage → hybrid read layers
```

Agents should call **`sync`** when the user wants durable / verifiable memory.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `node: command not found` | Install Node.js 20+ from https://nodejs.org/. |
| MCP tools missing after restart | Run `pnpm mcp:build`; check config path; fully restart client (Cmd+Q on macOS). |
| `Cannot find module` / missing `dist/cli.js` | Run `pnpm mcp:build` from repo root. |
| Empty recall | Wrong namespace — set `MEMWAL_NAMESPACE` consistently in MCP env. |
| `skipReason: "offline"` on sync | Pro Local only — add Walrus env vars for + Walrus Sync tier. |
| Owner key error at startup | Use **delegate key only** (ADR-002). |
| Want pure Walrus + analyze/restore | Use official `@mysten-incubation/memwal-mcp` — see `curl -sL https://memory.walrus.xyz/skills/setup`. |
| Judge / CI without keys | `pnpm mcp:e2e` from repo root. |

## Final Report

Keep the final response short and put **restart first** whenever config changed.

If setup succeeded (Pro Local):

```text
MemWal Agent Memory is configured (Pro Local).

Next: fully quit and reopen <AI client> now. On macOS, use Cmd+Q; closing the
window is not enough.

Config: <path changed>.
Build: pnpm mcp:build (if clone path).
After reopening, ask: "What MCP tools do you have available?"

Try:
- "Remember that this project uses hybrid local memory."
- "Recall what you know about hybrid local memory."
- "Use sync" (only after Walrus credentials are added).
```

If + Walrus Sync was configured, add one line: `Walrus Sync: credentials set in MCP env.`

Rules for the final response:

- Put the restart instruction before verification details.
- Keep it under 14 lines if there is no blocker.
- Offer at most 3 starter prompts.
- Never state blob ids or explorer links that the tools did not return.
- Do not include the full JSON config again after it has already been applied.
