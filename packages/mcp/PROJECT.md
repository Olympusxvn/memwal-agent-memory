# PROJECT.md — @memwalpp/mcp

**Package**: `@memwalpp/mcp`  
**Server name**: `memwal-agent-memory`  
**Parent project**: [MemWal Agent Memory](../../PROJECT.md)  
**OpenSpec**: [`docs/specs/openspec-mcp-server.md`](../../docs/specs/openspec-mcp-server.md)

---

## Purpose

Provide a **universal MCP front door** so any MCP-compatible agent can use MemWal Agent Memory without importing `@memwalpp/core` directly.

**Tagline (v1):** *A fast, private, verifiable hybrid memory layer that any MCP-compatible agent can use.*

**Core philosophy** — four needs most agents lack today:

| Need | How MCP delivers |
|------|------------------|
| **Persistent & reliable memory** | Local SQLite + optional Walrus sync |
| **Privacy & safety** | Server-side redaction + quality gate (unskippable on sync) |
| **Fast & contextual recall** | `search` ranked hybrid query; `recall` for context injection |
| **Verifiability + trust** | `verify`, `contentHash`, optional `proof` on verifiable hits |

**Hybrid flow:** Local (fast + private) → Redaction → Quality Gate → Walrus (durable + verifiable).

The MCP server is intentionally thin:

| Responsibility | Owner |
|----------------|-------|
| JSON-RPC transport (stdio + Streamable HTTP) | `@memwalpp/mcp` |
| Tool schemas + input validation | `@memwalpp/mcp` |
| Auth, rate limiting, safe logging | `@memwalpp/mcp` |
| Hybrid sync, quality gate, redaction | `@memwalpp/core` + `@memwalpp/local-memory` |
| Walrus durable storage | `@memwalpp/memwal-client` |

**Value inherited from parent project**: Verifiability › Privacy › Performance › Agent Autonomy.

---

## Scope

### v1.0 — shipped

- 9 memory tools: hybrid read/write, sync, proofs, stats
- Dual transport: stdio + Streamable HTTP
- Server-side privacy enforcement (S-1) — no bypass flags
- Delegate-key-only policy (ADR-002) — refuses owner keys at startup
- E2E stdio tests for core flows

### v1.1 — complete

| Phase | Status | Deliverable |
|-------|--------|-------------|
| **1.1a** | ✅ Done | Phone regex false-positive fix in redaction |
| **1.1g** | ✅ Done | Optional `redactLocal` on `remember()` |
| **1.1f** | ✅ Done | HTTP transport hardening (sessions, auth, rate limit) |
| **1.1b** | ✅ Done | Hybrid ranked search — `searchQuery` + MCP `search` scores, hitSource, verifiable |
| **1.1e** | ✅ Done | Real version history — metadata index + `getVersionHistory` |
| **1.1c** | ✅ Done | Layered verify — local proof + Walrus blob + Sui on-chain refs |
| **1.1d** | ✅ Done | Lineage indexer — local graph + Sui pack lineage via `getLineage` |

### Out of scope (v1)

- Marketplace tools (`createBounty`, `buyMemoryPack`, …)
- Chain write tools beyond durable sync
- Reimplementing redaction/scoring in MCP layer

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     MCP Clients                              │
│   Claude Desktop · Cursor · OpenClaw · custom agents       │
└──────────────────────────┬──────────────────────────────────┘
                           │ stdio | Streamable HTTP (/mcp)
┌──────────────────────────▼──────────────────────────────────┐
│                    @memwalpp/mcp                             │
│  cli.ts · server.ts · tools/* · middleware/* · transport/*   │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   @memwalpp/core   @memwalpp/local-memory   @memwalpp/memwal-client
   MemorySyncService   SQLite + redact       Walrus / MemWal SDK
```

### HTTP session model (1.1f)

Each MCP client connection gets:

- Its own `StreamableHTTPServerTransport` instance
- Its own `ToolSession` (id, authorized flag)
- Its own rate limiter bucket (RL-5)

Sessions are registered on MCP `initialize` and keyed by `mcp-session-id`.

---

## Dependencies

| Package | Usage |
|---------|-------|
| `@modelcontextprotocol/sdk` | MCP server, stdio + Streamable HTTP transports |
| `@memwalpp/core` | `MemorySyncService`, sync orchestration |
| `@memwalpp/local-memory` | Local SQLite store |
| `@memwalpp/memwal-client` | Durable Walrus store, read-only `ChainReader` |
| `@memwalpp/shared` | Shared memory types |
| `zod` | Tool input schemas |
| `express` | HTTP app (host validation, JSON body) |

---

## Security model

### stdio

Trusted local process — no bearer auth. Rate limiting optional (RL-4).

### HTTP

| Control | Policy |
|---------|--------|
| Bind address | Default `127.0.0.1`; `0.0.0.0` requires `MCP_HTTP_ALLOWED_HOSTS` |
| Auth | Bearer token for mutating/durable tools (S-5) |
| Startup | Fails if `requireAuth` without `MCP_HTTP_TOKEN` |
| Rate limit | Always on, per session (RL-4) |
| Body size | Configurable max JSON body (default 256 KiB) |
| Headers | `X-Content-Type-Options`, `X-Frame-Options`, `Cache-Control: no-store` |
| Logging | No raw memory content in logs |

See [`docs/SECURITY.md`](./docs/SECURITY.md).

---

## Tool classification

| Kind | Tools | HTTP auth |
|------|-------|-----------|
| Read `[R]` | recall, search, getLineage, getVersionHistory, getStats, verify | Optional |
| Mutate `[W]` | remember, softDelete | Required |
| Durable `[D]` | sync | Required |

See [`docs/TOOLS.md`](./docs/TOOLS.md).

---

## Testing strategy

| Suite | File | Coverage |
|-------|------|----------|
| Handlers | `test/handlers.test.ts` | Tool logic with mocked deps |
| Validate | `test/validate.test.ts` | S-1 bypass rejection |
| HTTP auth | `test/http-auth.test.ts` | Bearer + startup validation |
| HTTP rate limit | `test/http-rate-limit.test.ts` | RL-4/RL-5 |
| HTTP transport | `test/http-transport.test.ts` | Live Streamable HTTP integration |
| stdio E2E | `test/e2e-stdio.test.ts` | remember → recall → sync → redaction |

```bash
pnpm --filter @memwalpp/mcp test
pnpm mcp:e2e
```

---

## Versioning

- Package semver in `package.json` (`0.1.0`)
- MCP `serverInfo.version` matches package version
- Additive tools → minor bump + `tools/listChanged`
- Breaking schema changes → major bump

---

## Related documents

- [README.md](./README.md) — install, config, quick start
- [docs/HTTP.md](./docs/HTTP.md) — Streamable HTTP deployment
- [docs/SECURITY.md](./docs/SECURITY.md) — threat model & controls
- [docs/HYBRID-SEARCH.md](./docs/HYBRID-SEARCH.md) — ranked hybrid search (1.1b)
- [docs/VERIFY.md](./docs/VERIFY.md) — layered verify (1.1c)
- [docs/LINEAGE.md](./docs/LINEAGE.md) — lineage graph (1.1d)
- [../../FINAL_FEEDBACK.md](../../FINAL_FEEDBACK.md) — technical feedback for MemWal integrators
- [../../docs/specs/openspec-mcp-server.md](../../docs/specs/openspec-mcp-server.md) — canonical OpenSpec
