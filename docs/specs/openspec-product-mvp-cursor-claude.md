# OpenSpec — Product MVP (Cursor + Claude)

**Change ID:** `product-mvp-cursor-claude`
**Status:** Proposed (post–Sui Overflow 2026)
**Audience:** End users of Cursor IDE and Claude Desktop — not hackathon judges
**Depends on:** [`openspec-mcp-server.md`](openspec-mcp-server.md) (implemented), `@memwalpp/mcp`
**Product docs:** [`../product/README.md`](../product/README.md) · [`../product/landing.html`](../product/landing.html)

---

## 1. Problem

Hackathon repo proves hybrid memory + MCP + Move. **Product users** (Cursor / Claude) need:

1. Install in **≤2 minutes** without cloning the monorepo.
2. **Local project memory** that works with **zero API keys**.
3. Clear **when** the agent should `remember` / `recall` (rules + instructions).
4. Optional **Walrus sync** via official MemWal — not mixed with hackathon/on-chain story in primary README.
5. Verifiable smoke path: **install → test phrase → recall**.

Non-goals for MVP: dashboard, indexer, marketplace UI, npm chain tools discovery by default.

---

## 2. Product thesis

> **Project memory for AI assistants** — local SQLite per namespace, policy before upload, optional MemWal → Walrus backup. One MCP server for Cursor and Claude Desktop.

| Tier | Name | Requires | Value |
|------|------|----------|-------|
| **MVP default** | **Pro Local** | Node 20+ only | Fast recall, offline, no secrets |
| **Add-on** | **+ Walrus Sync** | MemWal delegate + relayer ([docs.memwal.ai](https://docs.memwal.ai/)) | Durable encrypted blobs, cross-device |

Chain tools (`createBounty`, …) remain **advanced / hidden** in product docs until Phase 3.

---

## 3. Personas

| Persona | Client | Primary tools | Namespace |
|---------|--------|---------------|-----------|
| Solo dev | Cursor | `remember`, `recall`, `search`, `getStats` | `${workspaceFolderBasename}` or git root hash |
| Knowledge worker | Claude Desktop | same | user-chosen, e.g. `my-project` |
| Team (Phase 2) | HTTP MCP | + bearer auth, shared host | org slug |

---

## 4. MVP scope (Phase 1 — 4–6 weeks)

### 4.1 In scope

| ID | Deliverable | Acceptance |
|----|-------------|------------|
| P1 | **Install path A** — open repo in Cursor → `.cursor/mcp.json` + `pnpm mcp:build` | MCP green in Settings |
| P2 | **Install path B** — `npx @memwalpp/mcp` (after npm publish) OR documented interim clone path | Single command start stdio |
| P3 | **Cursor rule** — [`.cursor/rules/memwal-mcp-product.mdc`](../../.cursor/rules/memwal-mcp-product.mdc) | Describes when to call MCP tools |
| P4 | **Claude instructions** — [`docs/product/claude-instructions.md`](../product/claude-instructions.md) | Paste into Claude project / config |
| P5 | **Product README** — [`docs/product/README.md`](../product/README.md) | Pro Local vs + Walrus Sync split |
| P6 | **Landing page** — [`docs/product/landing.html`](../product/landing.html) | install → test → recall, no dashboard |
| P7 | **E2E matrix** — [`docs/product/e2e-matrix.md`](../product/e2e-matrix.md) | Win + macOS × Cursor + Claude |
| P8 | **Config templates** — global Cursor, Claude Desktop, post-npm | Copy-paste ready |
| P9 | **`pnpm mcp:e2e`** stays CI gate | exit 0 on PR |

### 4.2 Out of scope (MVP)

- Smithery / Cursor Marketplace listing
- Bundled Move wallet flows in product onboarding
- Multi-tenant hosted MCP
- Mobile clients

---

## 5. Top 5 — immediate post-hackathon work

### 5.1 Publish `npx memwal-mcp` (`@memwalpp/mcp`)

**Today:** package is `private: true` with `workspace:*` deps — **not npm-installable standalone**.

**Interim (ship now):**

```bash
git clone https://github.com/Olympusxvn/memwal-agent-memory.git
cd memwal-agent-memory && pnpm install && pnpm mcp:build
# Cursor: open folder → .cursor/mcp.json
```

**Target (Phase 1b):**

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

**Publish checklist:**

| Step | Action |
|------|--------|
| 1 | Publish `@memwalpp/shared`, `local-memory`, `memwal-client`, `core` OR **esbuild bundle** single `dist/cli.bundle.js` |
| 2 | `packages/mcp`: `"private": false`, `"files": ["dist", "README.md"]`, `prepublishOnly`: build + test:e2e |
| 3 | `packages/mcp/README.md` — npm page copy from product README (Pro Local section) |
| 4 | Tag `mcp-v0.1.0`, `npm publish --access public` |
| 5 | Update landing + product README with `npx` as primary when live |

See [`../product/npm-publish.md`](../product/npm-publish.md).

### 5.2 Cursor rule + Claude instruction block

- **Cursor:** [`.cursor/rules/memwal-mcp-product.mdc`](../../.cursor/rules/memwal-mcp-product.mdc) — opt-in rule; users enable or copy to project.
- **Claude:** [`docs/product/claude-instructions.md`](../product/claude-instructions.md) — paste into Project Instructions or system prompt appendix.

**Acceptance:** New user follows doc; agent calls `remember` after explicit “remember this” without user naming tool JSON.

### 5.3 Product README vs hackathon README

| Doc | Purpose |
|-----|---------|
| [`README.md`](../../README.md) | Monorepo + hackathon + judges |
| [`docs/product/README.md`](../product/README.md) | **Product:** Pro Local / + Walrus Sync, Cursor + Claude only |

No removal of hackathon content from root README — add link: *“Using MCP in Cursor/Claude? → [Product guide](../product/README.md)”*.

### 5.4 E2E test matrix

Manual + automated matrix: [`docs/product/e2e-matrix.md`](../product/e2e-matrix.md).

Automated minimum (CI): `pnpm mcp:e2e` on Ubuntu (existing).

Manual before release tag: Windows 11 + macOS × Cursor MCP panel + Claude Desktop tools list.

### 5.5 Landing (1 page)

[`docs/product/landing.html`](../product/landing.html) — static, host on GitHub Pages or Vercel path `/product`.

Flow: **Install → Build (if clone) → Test phrase → Recall → Optional Walrus**.

No dashboard, no wallet connect.

---

## 6. Tool surface (product MVP)

**Default exposed (Pro Local):**

| Tool | User-visible purpose |
|------|----------------------|
| `remember` | Save decision, convention, bugfix context |
| `recall` | Inject relevant past context |
| `search` | Fast local lookup |
| `getStats` | Debug / trust (“do I have memories?”) |
| `softDelete` | Remove mistaken memory |

**Walrus tier (+ env):**

| Tool | When |
|------|------|
| `sync`, `promote` | User enabled MemWal env |
| `verify` | Show blob id after promote |

**Hidden from product docs (Phase 3):**

`createBounty`, `fulfillBounty`, `listMemoryPack`, `buyMemoryPack`, `forkMemory`

---

## 7. Configuration contract

### 7.1 Environment

| Variable | Pro Local | + Walrus Sync |
|----------|-----------|---------------|
| `MEMWAL_NAMESPACE` | recommended | recommended |
| `MEMWAL_MCP_DATA_DIR` | optional (default `~/.memwal-agent-memory/mcp`) | same |
| `MEMWAL_PRIVATE_KEY` | — | delegate key (ADR-002) |
| `MEMWAL_ACCOUNT_ID` | — | required |
| `MEMWAL_SERVER_URL` | — | relayer URL |
| `SUI_DELEGATE_*` | — | not required for MVP product |

### 7.2 Cursor deeplink

Config payload (base64): see [`../product/README.md`](../product/README.md#cursor-one-click-install).

Docs: [Cursor MCP install links](https://cursor.com/docs/mcp/install-links).

---

## 8. Success metrics (90 days post-hackathon)

| Metric | Target |
|--------|--------|
| Install → first successful `recall` | < 5 min (Pro Local) |
| `pnpm mcp:e2e` / CI | 100% green on main |
| Support tickets “MCP not listed” | ↓ via landing + matrix |
| Walrus promote (opt-in users) | blob id in `verify` response |
| npm weekly downloads `@memwalpp/mcp` | track after 1b ship |

---

## 9. Phase 2 preview (not MVP)

- HTTP MCP + team token
- Auto-promote policy (`MEMWAL_AUTO_PROMOTE_MIN_SCORE`)
- Namespace export/import (.db backup)
- Smithery listing

---

## 10. Phase 3 preview

- Chain tools in separate “Economy” doc
- Marketplace indexer + dashboard (hackathon Phase 8)

---

## 11. References

- MCP setup (technical): [`../mcp-setup.md`](../mcp-setup.md)
- MCP OpenSpec: [`openspec-mcp-server.md`](openspec-mcp-server.md)
- Official MemWal: [docs.memwal.ai](https://docs.memwal.ai/) · [GitHub MystenLabs/MemWal](https://github.com/MystenLabs/MemWal)
- Judge path (separate): [`../../JUDGE_GUIDE.md`](../../JUDGE_GUIDE.md)
