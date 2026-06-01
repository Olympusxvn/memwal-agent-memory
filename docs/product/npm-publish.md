# npm publish — `@memwalpp/mcp` / `memwal-mcp`

**Status:** Planned (Phase 1b). Package is currently `private: true` with `workspace:*` dependencies.

**Target command for users:**

```bash
npx -y @memwalpp/mcp --transport stdio
```

---

## Blocker

`@memwalpp/mcp` depends on:

- `@memwalpp/core`
- `@memwalpp/local-memory`
- `@memwalpp/memwal-client`
- `@memwalpp/shared`

npm consumers cannot resolve `workspace:*`. Choose **one**:

| Strategy | Pros | Cons |
|----------|------|------|
| **A. Publish all workspace packages** | Clean semver, matches monorepo | 4+ packages to maintain on npm |
| **B. esbuild single-file bundle** | One `npx` entry, simple UX | Larger artifact; native `better-sqlite3` must ship prebuilds or fall back to in-memory |
| **C. GitHub tarball install** | Quick hack | Poor DX, not true `npx` |

**Recommendation:** **B** for MVP — bundle to `dist/bundle.cjs` with `bin` pointing at bundle; document in-memory fallback when SQLite native missing.

---

## Pre-publish checklist

- [ ] `packages/mcp/package.json`: `"private": false`, `"files": ["dist", "README.md"]`
- [ ] `prepublishOnly`: `pnpm build && pnpm test:e2e`
- [ ] `packages/mcp/README.md` — npm homepage (link to `docs/product/README.md`)
- [ ] Version bump semver
- [ ] `npm login` + `npm publish --access public` (scoped `@memwalpp`)
- [ ] Update [product README](README.md) and [landing.html](landing.html) — primary install = `npx`
- [ ] Tag `mcp-v0.1.0`

---

## package.json sketch (post-bundle)

```json
{
  "name": "@memwalpp/mcp",
  "version": "0.1.0",
  "description": "MCP server — project memory for Cursor and Claude (local-first, optional Walrus)",
  "bin": { "memwal-mcp": "./dist/cli.js" },
  "files": ["dist", "README.md"],
  "publishConfig": { "access": "public" },
  "engines": { "node": ">=20" },
  "keywords": ["mcp", "cursor", "claude", "walrus", "memwal", "agent-memory"]
}
```

---

## Verify after publish

```bash
npx -y @memwalpp/mcp --transport stdio
# In another terminal — or use MCP client smoke
```

Add matrix row **M8** in [e2e-matrix.md](e2e-matrix.md): npx install without clone.
