# E2E test matrix — Product MVP (Cursor + Claude)

**Goal:** Pro Local tier works on Windows and macOS for both MCP clients before tagging a product release.

**Automated (CI):** `pnpm mcp:e2e` on Ubuntu — must exit `0` on every merge to `main`.

**Manual:** run before `mcp-v*` release tag or npm publish.

---

## Matrix

| # | OS | Client | Install path | MCP green | Smoke remember | Smoke recall | Notes |
|---|-----|--------|--------------|-----------|----------------|--------------|-------|
| M1 | Windows 11 | Cursor | Repo `.cursor/mcp.json` + `pnpm mcp:build` | ☐ | ☐ | ☐ | Windows Terminal |
| M2 | Windows 11 | Claude Desktop | `claude_desktop_config.json` + absolute path | ☐ | ☐ | ☐ | Full restart after config |
| M3 | macOS 14+ | Cursor | Same as M1 | ☐ | ☐ | ☐ | `${userHome}` in env |
| M4 | macOS 14+ | Claude Desktop | Same as M2 | ☐ | ☐ | ☐ | Config under `~/Library/Application Support/Claude/` |
| M5 | Ubuntu 24 | — | `pnpm mcp:e2e` only | ☐ | auto | auto | CI job `js` |
| M6 | Any | Cursor | Global `~/.cursor/mcp.json` + absolute `node …/cli.js` | ☐ | ☐ | ☐ | Optional |
| M7 | Any | Either | + Walrus env set | ☐ | promote | `verify` blob | + Walrus tier only |

---

## Smoke script (manual chat)

**Phrase:** `Product smoke test 2026 — namespace OK.`

1. Ask agent to **remember** the phrase (MCP tool `remember`).
2. Start a **new chat** (same project / same MCP config).
3. Ask agent to **recall** “Product smoke test 2026”.
4. **Pass:** phrase returned in tool output.

**CLI alternative:**

```bash
pnpm mcp:e2e
```

---

## Cursor-specific checks

- [ ] Settings → MCP → `memwal-agent-memory` listed and connected
- [ ] Tool list includes `remember`, `recall`, `search`, `getStats`
- [ ] Rule [`memwal-mcp-product.mdc`](../../.cursor/rules/memwal-mcp-product.mdc) enabled (optional but recommended)
- [ ] Deeplink from [product README](README.md) installs when project is open

---

## Claude Desktop-specific checks

- [ ] MCP icon / tools visible in chat
- [ ] [Project instructions](claude-instructions.md) pasted
- [ ] `MEMWAL_MCP_DATA_DIR` writable (no permission errors in MCP logs)
- [ ] Restart Claude after editing `claude_desktop_config.json`

---

## Failure log template

| Run ID | Matrix row | Failure | Fix / PR |
|--------|------------|---------|----------|
| | M1 | | |

---

## Related

- [`openspec-product-mvp-cursor-claude.md`](../specs/openspec-product-mvp-cursor-claude.md)
- [`mcp-setup.md`](../mcp-setup.md)
