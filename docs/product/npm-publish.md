# npm publish — `@memwalpp/mcp` / `memwal-mcp`

**Status:** **Published** — `@memwalpp/mcp@0.1.0` (2026-06-18)

**Registry:** https://www.npmjs.com/package/@memwalpp/mcp  
**npm org:** `@memwalpp` (owner: `olympusxvn`)

**User install:**

```bash
npx -y @memwalpp/mcp@0.1.0 --transport stdio
```

**Cursor plugin** (Marketplace distribution): [cursor-plugin-memwal-agent-memory](https://github.com/Olympusxvn/cursor-plugin-memwal-agent-memory) — publisher application submitted via [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish) (review pending).

---

## What shipped

| Item | Detail |
|------|--------|
| **Bundle** | `dist/bundle.mjs` (~134 KB) via esbuild — inlines `@memwalpp/*` workspace |
| **External deps** | `better-sqlite3`, `@mysten-incubation/memwal`, `@mysten/sui`, MCP SDK, Express, Zod |
| **Bin** | `memwal-mcp` → `dist/bundle.mjs` |
| **prepublishOnly** | `pnpm build && pnpm test` (42 tests) |

---

## Verify after install

```bash
npm view @memwalpp/mcp version
# → 0.1.0

npx -y @memwalpp/mcp@0.1.0 --transport stdio
# MCP stdio server (Ctrl+C to exit)
```

Monorepo CI path unchanged: `pnpm mcp:build && pnpm mcp:e2e`.

---

## Cursor global MCP config

```json
{
  "mcpServers": {
    "memwal-agent-memory": {
      "command": "npx",
      "args": ["-y", "@memwalpp/mcp@0.1.0", "--transport", "stdio"],
      "env": {
        "MEMWAL_NAMESPACE": "cursor",
        "MEMWAL_MCP_DATA_DIR": "${userHome}/.memwal-agent-memory/mcp"
      }
    }
  }
}
```

Same wiring ships in the [Cursor plugin repo](https://github.com/Olympusxvn/cursor-plugin-memwal-agent-memory/blob/master/mcp.json).

---

## Release checklist (next version)

- [ ] Bump semver in `packages/mcp/package.json` and `CHANGELOG.md`
- [ ] `pnpm --filter @memwalpp/mcp build && pnpm --filter @memwalpp/mcp test`
- [ ] `npm publish --access public --otp=<6-digit-or-recovery>` from `packages/mcp`
- [ ] Pin plugin repo `mcp.json` to new version; bump `plugin.json` semver
- [ ] Request Marketplace re-index after plugin manifest change
