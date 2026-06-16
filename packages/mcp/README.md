# @memwalpp/mcp

**Server name:** `memwal-agent-memory`  
**Package:** `@memwalpp/mcp` · **Version:** 0.1.0 (MCP v1 + v1.1 complete)

> *A fast, private, verifiable hybrid memory layer that any MCP-compatible agent can use.*

Universal [Model Context Protocol](https://modelcontextprotocol.io/) front door to [MemWal Agent Memory](https://github.com/Olympusxvn/memwal-agent-memory). Agents get local SQLite speed, optional Walrus durability, and server-enforced privacy — without importing `@memwalpp/core` directly.

**Hybrid flow:** Local (fast + private) → Redaction → Quality Gate → Walrus (durable + verifiable)

| Package | Role |
|---------|------|
| `@memwalpp/mcp` | Transport, schemas, auth, rate limiting |
| `@memwalpp/core` | `MemorySyncService` — sync, gates, orchestration |
| `@memwalpp/local-memory` | SQLite + PII redaction + semantic scoring |
| `@memwalpp/memwal-client` | Walrus durable store + read-only Sui `ChainReader` |

**Canonical spec:** [`docs/specs/openspec-mcp-server.md`](../../docs/specs/openspec-mcp-server.md)  
**Technical feedback (MemWal integrators):** [`FINAL_FEEDBACK.md`](../../FINAL_FEEDBACK.md)  
**Package design:** [`PROJECT.md`](./PROJECT.md)

---

## Quick start

### Monorepo (build + run)

```bash
pnpm install
pnpm mcp:build
node packages/mcp/dist/cli.js --transport stdio
```

Verify integration:

```bash
pnpm mcp:e2e
pnpm --filter @memwalpp/mcp test
```

### Cursor (`.cursor/mcp.json`)

```jsonc
{
  "mcpServers": {
    "memwal-agent-memory": {
      "command": "node",
      "args": ["packages/mcp/dist/cli.js", "--transport", "stdio"],
      "env": {
        "MEMWAL_NAMESPACE": "default",
        "MEMWAL_MCP_DATA_DIR": "${userHome}/.memwal-agent-memory/mcp"
      }
    }
  }
}
```

Run `pnpm mcp:build` after MCP code changes. Full setup: [`docs/mcp-setup.md`](../../docs/mcp-setup.md).

### Claude Desktop

See [`docs/examples/claude_desktop_config.json`](../../docs/examples/claude_desktop_config.json) — replace the repo path.

### Streamable HTTP

```bash
MCP_TRANSPORT=http \
MCP_HTTP_PORT=8787 \
MCP_HTTP_TOKEN="$(openssl rand -hex 32)" \
pnpm --filter @memwalpp/mcp start
```

Client URL: `http://127.0.0.1:8787/mcp` with `Authorization: Bearer <token>`.

Details: [`docs/HTTP.md`](./docs/HTTP.md)

---

## v1 tool surface (9 tools)

| Tool | Kind | HTTP auth | Description |
|------|------|-----------|-------------|
| `remember` | W | Required | Local write; optional `redactLocal` |
| `recall` | R | Optional | Hybrid recall (local + optional durable) |
| `search` | R | Optional | Ranked hybrid search — score, `hitSource`, `verifiable` |
| `sync` | D | Required | Promote pending rows — **unskippable** redact + gate |
| `getVersionHistory` | R | Optional | Version timeline (`metadata.versionHistory`) |
| `getLineage` | R | Optional | Ancestry graph — local + optional Sui pack lineage |
| `verify` | R | Optional | Layered proof — local / Walrus / on-chain |
| `softDelete` | R | Required | Tombstone (`metadata.deleted=1`) |
| `getStats` | R | Optional | Row counts + `durableLive` |

Marketplace write tools (`createBounty`, `buyMemoryPack`, …) are **not** registered in v1.

**Reference:** [`docs/TOOLS.md`](./docs/TOOLS.md)

---

## v1.1 capabilities (shipped)

| Phase | Feature |
|-------|---------|
| 1.1a | Phone regex false-positive fix (upstream redaction) |
| 1.1g | `remember.redactLocal` — redact before SQLite persist |
| 1.1f | HTTP hardening — sessions, bearer auth, per-session rate limits |
| 1.1b | Hybrid ranked `search` — see [`docs/HYBRID-SEARCH.md`](./docs/HYBRID-SEARCH.md) |
| 1.1e | Real `getVersionHistory` from metadata index |
| 1.1c | Layered `verify` — see [`docs/VERIFY.md`](./docs/VERIFY.md) |
| 1.1d | Lineage indexer — see [`docs/LINEAGE.md`](./docs/LINEAGE.md) |

---

## Agent workflows

### Local-only (no Walrus keys)

```
remember → recall / search → verify({ proof })
```

### Full hybrid (verifiable)

```
remember → sync → search(includeProof) → verify({ memoryId })
```

### Lineage + trust

```
remember → sync → getLineage → verify({ memoryId, checkOnChain: true })
```

---

## Configuration

### Core

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_TRANSPORT` | `stdio` | `stdio` or `http` |
| `MEMWAL_NAMESPACE` | `default` | Active memory namespace |
| `MEMWAL_SYNC_QUALITY_MIN` | `40` | Quality gate threshold (0–100) |
| `MEMWAL_MCP_DATA_DIR` | `~/.memwal-agent-memory/mcp` | SQLite directory |
| `MEMWAL_MCP_USE_MEMORY` | — | `1` = in-memory store (tests) |
| `MEMWAL_MCP_MOCK_DURABLE` | — | `1` = mock Walrus (E2E / CI) |

### MemWal / Walrus (durable sync)

| Variable | Description |
|----------|-------------|
| `MEMWAL_RELAYER_URL` | MemWal relayer endpoint |
| `MEMWAL_PRIVATE_KEY` | **Delegate key only** — owner keys refused (ADR-002) |
| `MEMWAL_ACCOUNT_ID` | MemWal account id |

Without MemWal env, local tools work; `sync` returns `skipReason: "offline"`.

### On-chain reads (verify / lineage)

| Variable | Default | Description |
|----------|---------|-------------|
| `SUI_NETWORK` | `mainnet` | Sui RPC network for read-only `ChainReader` |

No signing key required for `verify` / `getLineage` on-chain layers.

### HTTP (1.1f)

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_HTTP_HOST` | `127.0.0.1` | Bind address |
| `MCP_HTTP_PORT` | `8787` | Listen port |
| `MCP_HTTP_TOKEN` | — | Bearer token (`MCP_BEARER_TOKEN` alias) |
| `MCP_HTTP_REQUIRE_AUTH` | `1` (HTTP) | Set `0` to disable (not recommended) |
| `MCP_HTTP_MAX_BODY_BYTES` | `262144` | Max POST body |
| `MCP_HTTP_ALLOWED_HOSTS` | — | Required when binding `0.0.0.0` |

Startup fails if auth is required but no token is set.

---

## Architecture

```
┌─────────────────────────────────────────┐
│  MCP clients                             │
│  Cursor · Claude Desktop · OpenClaw     │
└──────────────────┬──────────────────────┘
                   │ JSON-RPC 2.0
                   │ stdio | POST /mcp
┌──────────────────▼──────────────────────┐
│  @memwalpp/mcp                           │
│  server.ts · tools/* · middleware/*      │
│  transport/stdio · transport/http        │
└──────────────────┬──────────────────────┘
                   │
     ┌─────────────┼─────────────┐
     ▼             ▼             ▼
  @memwalpp/core  local-memory  memwal-client
  MemorySyncService  SQLite     Walrus + ChainReader
```

The MCP layer **does not reimplement** redaction or scoring.

---

## Privacy and security

- **S-1:** Bypass flags (`skipRedaction`, `bypassGate`, …) rejected on all tools.
- **Default redaction** on `sync`; optional `redactLocal` on `remember`.
- **HTTP:** Mutating and durable tools require bearer token; read tools optional.
- **Logging:** No raw memory content in logs.

Details: [`docs/SECURITY.md`](./docs/SECURITY.md)

---

## Transports

| Transport | Default | Use case |
|-----------|---------|----------|
| **stdio** | ✓ | Local IDE agents — trusted process |
| **Streamable HTTP** | `MCP_TRANSPORT=http` | Remote / multi-session deployments |

Both expose the **same nine tools** (OpenSpec T-1).

HTTP health: `GET /health`, `GET /ready` (no auth).

---

## Development

```bash
pnpm --filter @memwalpp/mcp check    # typecheck
pnpm --filter @memwalpp/mcp test     # 42 tests
pnpm mcp:e2e                         # stdio integration
pnpm --filter @memwalpp/mcp dev -- --transport stdio
```

| Suite | Coverage |
|-------|----------|
| `test/handlers.test.ts` | Tool handlers, hybrid flows |
| `test/http-*.test.ts` | Auth, rate limit, Streamable HTTP |
| `test/e2e-stdio.test.ts` | Full stdio client cycle |
| `test/validate.test.ts` | S-1 bypass rejection |

---

## Error codes

| Code | Meaning |
|------|---------|
| `-32001` | Unauthorized — mutating/durable tool without bearer |
| `-32002` | Rate limited — includes `retryAfterMs` |
| `-32602` | Invalid params — bypass flags or schema violation |

---

## Documentation index

| Document | Content |
|----------|---------|
| [`docs/TOOLS.md`](./docs/TOOLS.md) | Full tool schemas and responses |
| [`docs/HYBRID-SEARCH.md`](./docs/HYBRID-SEARCH.md) | Ranked search (1.1b) |
| [`docs/VERIFY.md`](./docs/VERIFY.md) | Layered verify (1.1c) |
| [`docs/LINEAGE.md`](./docs/LINEAGE.md) | Lineage graph (1.1d) |
| [`docs/HTTP.md`](./docs/HTTP.md) | HTTP deployment |
| [`docs/SECURITY.md`](./docs/SECURITY.md) | Threat model |
| [`../../docs/mcp-setup.md`](../../docs/mcp-setup.md) | Cursor / Claude setup |
| [`../../FINAL_FEEDBACK.md`](../../FINAL_FEEDBACK.md) | Technical feedback for MemWal integrators |

---

## License

See repository root [LICENSE](../../LICENSE).
