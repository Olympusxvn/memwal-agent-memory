# MCP comparison — Official Walrus Memory vs `@memwalpp/mcp`

Side-by-side reference for integrators and judges. Official setup skill: [`curl -sL https://memory.walrus.xyz/skills/setup`](https://memory.walrus.xyz/skills/setup). Hybrid setup skill: [`curl -sL https://memwalpp-dashboard.vercel.app/skills/setup`](https://memwalpp-dashboard.vercel.app/skills/setup).

**Relationship:** This repo **wraps** [`@mysten-incubation/memwal`](https://www.npmjs.com/package/@mysten-incubation/memwal); it does not fork Mysten's SDK. The two MCP servers **complement** each other.

---

## At a glance

| | **Official Walrus Memory** (`@mysten-incubation/memwal-mcp`) | **`@memwalpp/mcp`** (this repo) |
|---|---|---|
| **Tagline** | Durable Walrus memory on the relayer | *Fast, private, verifiable hybrid memory layer* |
| **Setup** | `curl -sL https://memory.walrus.xyz/skills/setup` → `npx -y @mysten-incubation/memwal-mcp` | `curl -sL https://memwalpp-dashboard.vercel.app/skills/setup` → `npx -y @memwalpp/mcp@0.1.0` or [Cursor plugin](https://github.com/Olympusxvn/cursor-plugin-memwal-agent-memory) |
| **Adapter / wrapper** | No — direct relayer | Yes — `@memwalpp/core` + SQLite + redact/quality gate |
| **Default tier** | Cloud-first (Walrus) | **Pro Local** (SQLite); **+ Walrus Sync** optional |
| **Auth** | Browser login → `~/.memwal/credentials.json`; tools `memwal_login` / `memwal_logout` | Env `MEMWAL_PRIVATE_KEY` + `MEMWAL_ACCOUNT_ID` (delegate key only); or Pro Local with no keys |
| **Write flow** | `memwal_remember` → relayer → Walrus (automatic) | `remember` → local SQLite → **`sync`** promotes to Walrus (gated) |
| **Offline / CI** | Needs login + network for real memory | `pnpm mcp:e2e` + `MEMWAL_MCP_MOCK_DURABLE=1` — no keys |
| **Transport** | stdio + **Remote MCP** on relayer (`/api/mcp`) for ChatGPT | stdio + **self-hosted** Streamable HTTP (`MCP_TRANSPORT=http`) |
| **Tool count** | 9 (`memwal_*`) | 9 (generic names) |

---

## Tool surface

### Official (`memwal_*`)

| Tool | Role |
|------|------|
| `memwal_remember` | Save to Walrus via relayer |
| `memwal_remember_bulk` | Batch save |
| `memwal_recall` | Semantic recall |
| `memwal_analyze` | Analyze / capture patterns |
| `memwal_restore` | Rebuild search index from Walrus blobs |
| `memwal_health` | Server health check |
| `memwal_login` | Browser sign-in flow |
| `memwal_logout` | Clear local credentials |

### `@memwalpp/mcp`

| Tool | Role |
|------|------|
| `remember` | Local SQLite write; optional `redactLocal` |
| `recall` | Hybrid recall (local + optional durable hydrate) |
| `search` | Ranked hybrid search — `score`, `hitSource`, `verifiable` |
| `sync` | Promote pending rows — **unskippable** redact + quality gate |
| `getVersionHistory` | Version timeline from `metadata.versionHistory` |
| `getLineage` | Ancestry graph — local + optional Sui pack lineage |
| `verify` | Layered proof — local / Walrus / on-chain |
| `softDelete` | Tombstone (`metadata.deleted=1`) |
| `getStats` | Row counts + `durableLive` |

Marketplace write tools (`createBounty`, `buyMemoryPack`, …) are **not** registered in MCP v1.

---

## Capabilities matrix

| Capability | Official | `@memwalpp/mcp` |
|---|---|---|
| One-command install (`npx`) | ✅ | ✅ [`@memwalpp/mcp@0.1.0`](https://www.npmjs.com/package/@memwalpp/mcp) |
| Browser / zkLogin login | ✅ `memwal_login` | ❌ (use env or official login → copy credentials) |
| Remote MCP on hosted relayer | ✅ ChatGPT + custom headers | ❌ (self-hosted HTTP only) |
| Local SQLite, offline recall/search | ❌ | ✅ |
| PII redaction before Walrus upload | Relayer-side | ✅ server-enforced on `sync`; optional on `remember` |
| Quality gate before promote | ❌ | ✅ `MEMWAL_SYNC_QUALITY_MIN` |
| Hybrid ranked `search` | `memwal_recall` | ✅ local score + optional durable |
| Layered `verify` (local / Walrus / chain) | ❌ | ✅ |
| Lineage graph | ❌ | ✅ `getLineage` |
| Version history timeline | ❌ | ✅ `getVersionHistory` |
| `analyze` / `restore` index | ✅ | ❌ (backlog — use official MCP or SDK) |
| Judge demo without keys | Needs login once | ✅ `pnpm mcp:e2e` |

---

## Architecture

```
Official memwal-mcp          @memwalpp/mcp (hybrid)
───────────────────          ──────────────────────
Agent                          Agent
  │                              │
  ▼                              ▼
npx @mysten-incubation/        MCP server (stdio | HTTP)
  memwal-mcp                     │
  │                              ├── SQLite (fast, private)
  ▼                              ├── Redact + quality gate
Relayer / Walrus                 └── MemWal relayer → Walrus
```

---

## Tiers inside `@memwalpp/mcp`

| | **Pro Local** (default) | **+ Walrus Sync** |
|---|---|---|
| **Needs** | Node 20+ only | + delegate key, account ID, relayer URL |
| **Storage** | `~/.memwal-agent-memory/mcp` (SQLite) | Same local + encrypted blobs on Walrus |
| **Offline** | Full `remember` / `recall` / `search` | Local offline; `sync` needs network |
| **Privacy** | Data stays on device | Redaction + gate **before** MemWal upload |
| **Best for** | Daily Cursor / Claude coding | Backup, second machine, verifiable durable layer |

---

## When to use which

| Need | Use |
|------|-----|
| Pure Walrus Memory, one `npx`, ChatGPT remote MCP, analyze/restore | **Official** + [`memory.walrus.xyz/skills/setup`](https://memory.walrus.xyz/skills/setup) |
| Project memory: local speed + privacy gate + controlled promote | **`@memwalpp/mcp`** Pro Local |
| Verifiable hybrid memory + lineage + layered verify | **`@memwalpp/mcp`** + Walrus Sync |
| Hackathon / CI without MemWal keys | **`pnpm mcp:e2e`** |

---

## Further reading

| Doc | Content |
|-----|---------|
| [`docs/skills/setup.md`](docs/skills/setup.md) | Agent setup skill (Pro Local vs Walrus Sync) |
| [`docs/product/README.md`](docs/product/README.md) | Product guide |
| [`docs/mcp-setup.md`](docs/mcp-setup.md) | Technical MCP reference |
| [`packages/mcp/README.md`](packages/mcp/README.md) | Package docs |
| [`docs/product/npm-publish.md`](docs/product/npm-publish.md) | npm publish record (`@memwalpp/mcp@0.1.0`) |
| [Cursor plugin repo](https://github.com/Olympusxvn/cursor-plugin-memwal-agent-memory) | Marketplace bundle (rules, skills, MCP wiring) |
| [`docs/walrus-memory-alignment.md`](docs/walrus-memory-alignment.md) | SDK parity backlog |
| [`docs/judge-walrus-memory-workshop.md`](docs/judge-walrus-memory-workshop.md) | Judge dual-MCP notes |
| [`FINAL_FEEDBACK.md`](FINAL_FEEDBACK.md) | MemWal integrator feedback |
