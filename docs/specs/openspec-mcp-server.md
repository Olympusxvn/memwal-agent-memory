# OpenSpec — MemWal Agent Memory MCP Server

**Change ID:** `mcp-server-wave5`
**Status:** Draft (proposed — new package `@memwalpp/mcp`)
**Package:** `packages/mcp` → `@memwalpp/mcp`
**Server name:** `memwal-agent-memory`
**Depends on:** `@memwalpp/core` (`MemorySyncService`), `@memwalpp/local-memory` (`LocalMemoryStore`), `@memwalpp/memwal-client`, `@memwalpp/shared`
**ADRs:** ADR-002 (delegate-only keys / no key logging), ADR-005 (local score non-authoritative), ADR-010 (redact + gate before durable), ADR-013 (package boundaries)
**Master spec:** [`openspec-memwal-agent-memory.md`](openspec-memwal-agent-memory.md) §7

> Goal: any **MCP-compatible** agent (Claude Desktop, Cursor, OpenClaw, custom) can use the
> hybrid memory layer **without importing our packages** — connect to the server, discover
> tools, call them. The server is the **universal, privacy-enforcing front door** to
> `MemorySyncService` + `LocalMemoryStore` + the Move economy.

---

## 1. Problem

The hybrid memory layer is currently reachable only through TypeScript imports (`@memwalpp/core`,
`@memwalpp/local-memory`) or in-repo demos (`apps/agent-swarm`). External agents cannot use it.
We need a **protocol boundary** that:

1. Exposes memory + marketplace operations as **MCP tools**.
2. Enforces **redaction + quality gate server-side** so a client cannot bypass privacy (ADR-010).
3. Keeps **delegate signing keys server-side only** (ADR-002) — never returned to clients.
4. Is **discoverable**: tools self-describe so agents can plan against them.
5. Works **local (stdio)** for desktop agents and **remote (HTTP)** for shared deployments.

---

## 2. Architecture & boundaries (ADR-013)

```
MCP client (Claude / Cursor / OpenClaw / custom)
        │  JSON-RPC 2.0 over stdio | Streamable HTTP
        ▼
[ packages/mcp ]  MemWalMcpServer
        │  (composes, never reimplements)
        ├─→ @memwalpp/core          MemorySyncService  (pushOne/pullQuery/syncPending/fullSync/softDelete)
        ├─→ @memwalpp/local-memory  LocalMemoryStore   (remember/recall/getById/prune)
        ├─→ @memwalpp/memwal-client MemWalClient       (durable; delegate signing)
        └─→ @memwalpp/shared        types + Move package constants (PTB targets)
```

**Rules:**
- `packages/mcp` is an **app-like leaf**: it is **never imported by other `packages/*`**.
- `mcp` **must not** reimplement redaction, scoring, or sync — it **delegates** to `core` /
  `local-memory`. It only does: transport, schema validation, auth, rate limiting, error mapping.
- `mcp` imports `core` (allowed direction); `core`/`local-memory` never import `mcp`.

---

## 3. Transport

| Transport | Use case | Mechanism |
|-----------|----------|-----------|
| **stdio** | Local desktop agents (Claude Desktop, Cursor, OpenClaw on same machine) | JSON-RPC 2.0 over stdin/stdout; one process per client |
| **Streamable HTTP** | Remote / shared deployment, multiple agents | MCP Streamable HTTP transport; SSE for server→client streaming; session id per connection |

**Requirements:**

- T-1: Both transports expose an **identical tool surface** (§5). No tool is stdio- or HTTP-only.
- T-2: stdio process holds delegate keys from local env (`.env`, gitignored); never echoes them.
- T-3: HTTP transport requires a **bearer session token**; unauthenticated calls to mutating tools are rejected (`-32001 unauthorized`).
- T-4: HTTP binds to configurable host/port; defaults to `127.0.0.1` (opt-in to `0.0.0.0`).
- T-5: Transport is selected by flag/env: `MCP_TRANSPORT=stdio|http` (default `stdio`).

---

## 4. Capabilities & discoverability

On `initialize`, the server declares:

```jsonc
{
  "protocolVersion": "2025-06-18",
  "serverInfo": { "name": "memwal-agent-memory", "version": "1.0.0" },
  "capabilities": {
    "tools": { "listChanged": true },
    "resources": { "subscribe": false, "listChanged": false },
    "logging": {}
  }
}
```

**Requirements:**

- D-1: `tools/list` returns every tool in §5 with a **JSON Schema** for `inputSchema` (and `outputSchema` where supported).
- D-2: Each tool description states its **layer**, whether it **mutates durable/chain state**, and whether it **triggers redaction**.
- D-3: Read-only vs mutating tools are tagged via an `annotations.readOnlyHint` / `destructiveHint`.
- D-4: A `resources/list` (optional) MAY expose read-only namespaces (e.g. `memwal://namespace/{ns}/stats`) but no raw memory content as a resource.

---

## 5. Tool Surface

> Notation: **R** = read-only, **W** = mutates local, **D** = mutates durable/Walrus,
> **C** = composes a Sui PTB (chain). "Gate" = runs redaction + quality gate.

| Tool | Kind | Gate | Delegates to | Description |
|------|------|------|--------------|-------------|
| `remember` | W (+ optional D) | yes if promoted | `LocalMemoryStore.remember` → optional `sync.pushOne` | Store a memory. Local write always; if `promote: true`, runs gate + durable push. |
| `recall` | R | no | `MemorySyncService.pullQuery` | Hybrid recall: local vector recall + optional durable hydrate; returns ranked `MemoryRecord[]`. |
| `search` | R | no | `MemorySyncService.searchQuery` | Hybrid ranked search: local semantic score + optional Walrus hydrate; returns scores, hitSource, verifiable flag (1.1b). |
| `sync` | D | yes | `MemorySyncService.syncPending` / `fullSync` | Promote pending local rows to Walrus (redact + gate per row). Returns `SyncMetrics`. |
| `promote` | D | yes | `MemorySyncService.pushOne` | Force gate + redaction + durable write for one `recordId`. Returns `blobId` or skip reason. |
| `verify` | R | no | `memwal-client` + `shared` | Return PoA / `walrusBlobId` / on-chain refs for a memory (verifiability surface). |
| `getLineage` | R | no | `core` lineage index | Return version + fork ancestry graph for a memory/pack. |
| `forkMemory` | W (+ C) | yes on re-publish | `core` fork + `memory_nft` PTB | Fork an acquired memory; preserve lineage + royalty path to original creator. |
| `softDelete` | W | no | `MemorySyncService.softDelete` | Tombstone a memory (`metadata.deleted=1`); excluded from future pushes. |
| `createBounty` | C | no | `bounty::post_bounty` PTB | Lock `Coin<WAL>` into a shared `Bounty` (deadline + description hash). |
| `fulfillBounty` | C (+ D) | yes | `bounty::submit_fulfillment` PTB | Promote fulfillment memory → attach `walrus_blob_id` as on-chain proof. |
| `listMemoryPack` | C | no | `marketplace::list_pack` PTB | List a `MemoryPack` for sale in package `WAL`. |
| `buyMemoryPack` | C (+ D) | no | `marketplace::buy_pack` PTB | Buy a listed pack; hydrate purchased blobs locally. |
| `getStats` | R | no | `local` + indexer | Counts: local rows, synced rows, namespaces, pending sync. |

### 5.1 Representative schemas

```jsonc
// remember
{
  "name": "remember",
  "inputSchema": {
    "type": "object",
    "required": ["content"],
    "properties": {
      "content": { "type": "string", "maxLength": 8000 },
      "namespace": { "type": "string", "default": "default" },
      "tags": { "type": "array", "items": { "type": "string" } },
      "promote": { "type": "boolean", "default": false }
    }
  }
}
// returns: { recordId, stored: true, promoted?: boolean, blobId?: string, skipReason?: "gate"|"offline" }

// recall
{
  "name": "recall",
  "inputSchema": {
    "type": "object",
    "required": ["query"],
    "properties": {
      "query": { "type": "string" },
      "namespace": { "type": "string" },
      "limit": { "type": "integer", "default": 8, "maximum": 50 },
      "forceDurable": { "type": "boolean", "default": false }
    }
  }
}
// returns: { hits: MemoryRecord[], source: "local"|"hybrid" }

// fulfillBounty
{
  "name": "fulfillBounty",
  "inputSchema": {
    "type": "object",
    "required": ["bountyId", "recordId"],
    "properties": {
      "bountyId": { "type": "string" },
      "recordId": { "type": "string" }
    }
  }
}
// returns: { walrusBlobId: string, txDigest: string }
```

---

## 6. Privacy & Security (non-negotiable)

| ID | Requirement | Enforced where |
|----|-------------|----------------|
| S-1 | **Redaction is server-side and unskippable.** Any path that writes durable (`promote`, `sync`, `fulfillBounty`) runs `redactForUpstream` via `MemorySyncService`; a client cannot pass a `skipRedaction` flag. | `core` (delegated), `mcp` validates no bypass |
| S-2 | **Quality gate enforced.** Durable writes only happen for rows scoring `>= qualityMin` (default 40). Below gate → `{ skipReason: "gate" }`. | `core` |
| S-3 | **No raw memory content in logs.** Server logs tool name, recordId, namespace, metrics — never pre-redaction content (ADR-002). | `mcp` logger + `SyncLogger` |
| S-4 | **Delegate keys server-side only.** `MEMWAL_PRIVATE_KEY` / delegate secrets live in server env; never returned in any tool result or error. | `memwal-client`, `mcp` |
| S-5 | **Auth on mutating + chain tools.** `W`/`D`/`C` tools require an authorized session (HTTP bearer token or trusted local stdio). Read-only tools MAY be allowed unauthenticated in stdio mode. | `mcp` auth middleware |
| S-6 | **Input sanitization.** All tool inputs validated against JSON Schema before reaching `core`; reject oversized payloads (`content` > 8000 chars). | `mcp` |
| S-7 | **No owner keys.** Only delegate signing (ADR-002); server refuses to start if configured with an owner key. | `mcp` startup check |
| S-8 | **Previews are redacted.** Marketplace/lineage tools return redacted metadata only; full sealed content stays Seal-gated. | `mcp` + `core` |

---

## 7. Integration with MemorySyncService & LocalMemoryStore

The server is constructed with **injected dependencies** (no global state, testable):

```ts
export interface MemWalMcpDeps {
  sync: MemorySyncService;        // @memwalpp/core
  local: LocalMemoryStore;        // @memwalpp/local-memory (Sqlite or InMemory)
  durable?: DurableMemoryStore;   // @memwalpp/memwal-client (optional; offline-safe)
  config?: MemWalMcpConfig;
}

export interface MemWalMcpConfig {
  transport?: "stdio" | "http";
  http?: { host: string; port: number; requireAuth: boolean };
  qualityMin?: number;            // forwarded to sync (default 40)
  defaultNamespace?: string;      // default "default"
  rateLimit?: RateLimitConfig;
}

export function createMemWalMcpServer(deps: MemWalMcpDeps): MemWalMcpServer;
```

**Mapping (tool → existing API):**

| Tool | Underlying call |
|------|-----------------|
| `remember` | `local.remember(record)` → if `promote` then `sync.pushOne(id)` |
| `recall` | `sync.pullQuery(query, { namespace, limit, forceDurable })` |
| `search` | `local.recall(query, namespace, limit)` |
| `sync` | `sync.syncPending(ns)` or `sync.fullSync(ns)` |
| `promote` | `sync.pushOne(recordId, { namespace })` |
| `softDelete` | `sync.softDelete(recordId, { namespace })` |
| `verify` | read `MemoryRecord.walrusBlobId` + PoA via `durable` |
| `fulfillBounty` | `sync.pushOne` → take `blobId` → compose `bounty::submit_fulfillment` PTB |

**Offline behavior:** if `durable` is unavailable, durable/chain tools return a structured
`offline` result (not a crash); local tools (`remember` w/o promote, `search`) keep working —
consistent with `MemorySyncService` offline semantics.

---

## 8. Error handling

JSON-RPC error codes (standard + server-defined):

| Code | Name | When |
|------|------|------|
| `-32700` | Parse error | Malformed JSON |
| `-32600` | Invalid request | Not valid JSON-RPC |
| `-32601` | Method not found | Unknown tool |
| `-32602` | Invalid params | Fails input JSON Schema |
| `-32001` | Unauthorized | Mutating/chain tool without valid session (S-5) |
| `-32002` | Rate limited | Exceeds quota (§10); includes `retryAfterMs` |
| `-32003` | Gate rejected | Quality gate failed (not an error to the agent — also surfaced as tool result `skipReason: "gate"`) |
| `-32004` | Durable offline | Walrus/MemWal unreachable for a `D` tool |
| `-32005` | Chain error | PTB build/exec failed; includes sanitized reason (no keys) |

**Rules:**
- E-1: Tool *business* outcomes (gate skip, offline) are returned as **successful tool results** with a `skipReason`, not protocol errors — so agents can reason about them.
- E-2: Protocol errors (`-326xx`) are reserved for malformed/unauthorized/rate-limited calls.
- E-3: Error messages are **sanitized**: never include keys, raw content, or stack traces with secrets.
- E-4: Every error is logged with a correlation id; content is never logged (S-3).

---

## 9. Versioning

| Aspect | Policy |
|--------|--------|
| Server version | Semver in `serverInfo.version`; bump **minor** for additive tools, **major** for breaking schema changes. |
| MCP protocol | Declared `protocolVersion`; negotiate down if client is older; reject incompatible majors. |
| Tool schema evolution | Add optional fields freely; removing/renaming a field or tool = **major** bump + `tools/listChanged` notification. |
| Deprecation | Mark tool description `[DEPRECATED]` for ≥1 minor before removal. |

---

## 10. Rate limiting

| ID | Requirement |
|----|-------------|
| RL-1 | Per-session token-bucket: default **60 calls/min**, burst **10**; configurable via `rateLimit`. |
| RL-2 | Stricter sub-limit on **durable/chain** tools (`D`/`C`): default **10/min** (network + gas cost). |
| RL-3 | Exceeding limit → `-32002` with `retryAfterMs`. |
| RL-4 | stdio (single trusted local client) MAY disable rate limiting via config; HTTP **always** rate limits. |
| RL-5 | Limits counted per session id (HTTP) or per process (stdio). |

---

## 11. Example usage

### 11.1 Claude Desktop (stdio)

`claude_desktop_config.json`:

```jsonc
{
  "mcpServers": {
    "memwal-agent-memory": {
      "command": "pnpm",
      "args": ["--filter", "@memwalpp/mcp", "start", "--", "--transport", "stdio"],
      "env": {
        "MEMWAL_RELAYER_URL": "https://relayer.example",
        "MEMWAL_PRIVATE_KEY": "<delegate-key-from-secret-store>"
      }
    }
  }
}
```

Agent prompt → Claude calls `recall { "query": "Walrus bounty proof", "limit": 5 }` then
`remember { "content": "...", "promote": true }`.

### 11.2 Cursor (`.cursor/mcp.json`)

```jsonc
{
  "mcpServers": {
    "memwal-agent-memory": {
      "command": "node",
      "args": ["packages/mcp/dist/cli.js", "--transport", "stdio"]
    }
  }
}
```

### 11.3 Remote / OpenClaw (Streamable HTTP)

```bash
# start server
MCP_TRANSPORT=http MCP_HTTP_PORT=8787 pnpm --filter @memwalpp/mcp start
```

```jsonc
// OpenClaw mcp client config
{
  "servers": {
    "memwal": {
      "url": "http://127.0.0.1:8787/mcp",
      "headers": { "Authorization": "Bearer <session-token>" }
    }
  }
}
```

OpenClaw bounty-hunter loop maps directly to tools:
`createBounty` → `recall` → `remember(promote)` → `fulfillBounty` → (on approve) `forkMemory`.

---

## 12. Package layout

```
packages/mcp/
├── package.json            # name "@memwalpp/mcp"; bin: cli
├── src/
│   ├── index.ts            # createMemWalMcpServer + types (barrel)
│   ├── server.ts           # MemWalMcpServer (transport-agnostic core)
│   ├── tools/              # one file per tool group: memory.ts, sync.ts, market.ts, bounty.ts
│   ├── transport/
│   │   ├── stdio.ts
│   │   └── http.ts
│   ├── middleware/         # auth.ts, rate-limit.ts, validate.ts, logger.ts
│   └── cli.ts              # entry; reads MCP_TRANSPORT
└── test/                   # vitest: schema validation, gate-not-bypassable, offline paths
```

Root scripts:

| Script | Runs |
|--------|------|
| `pnpm mcp:start` | `pnpm --filter @memwalpp/mcp start` |
| `pnpm mcp:dev` | stdio dev server with `tsx` |
| `pnpm mcp:inspect` | launch with MCP Inspector for tool discovery testing |

---

## 13. Success criteria

| Check | Pass condition |
|-------|----------------|
| Tool surface live | `tools/list` returns all §5 tools with valid JSON Schemas |
| Privacy unskippable | Test proves `promote`/`sync`/`fulfillBounty` always run redaction; no bypass flag exists (S-1) |
| Gate enforced | Below-`qualityMin` content returns `skipReason: "gate"`, no blob written (S-2) |
| No secrets leaked | Grep test: keys/raw content never in logs or error payloads (S-3, S-4, E-3) |
| Dual transport | Same tools work over stdio and HTTP (T-1) |
| Offline-safe | Durable down → local tools still succeed; `D` tools return `offline` (not crash) |
| Auth + rate limit | HTTP rejects unauth mutating calls (`-32001`); over-quota → `-32002` |
| DAG clean | `mcp` imports `core`/`local-memory`/`memwal-client`/`shared` only; not imported by `packages/*` |
| Real client connect | Claude Desktop **or** Cursor connects and calls `recall`/`remember` end-to-end |
| Build green | `pnpm run check` + `pnpm --filter @memwalpp/mcp test` green |

---

## 14. Acceptance

| Item | PASS |
|------|------|
| OpenSpec (this doc) | ✓ |
| Tool Surface table + schemas | ✓ |
| Privacy/Security requirements (S-1…S-8) | ✓ |
| Transport (stdio + HTTP) defined | ✓ |
| Integration mapping to `MemorySyncService` / `LocalMemoryStore` | ✓ |
| Error / versioning / rate-limit policies | ✓ |
| Example configs (Claude / Cursor / OpenClaw) | ✓ |

---

## 15. v1.1 implementation status

| Phase | Status | Notes |
|-------|--------|-------|
| **1.1a** | ✅ | Phone regex false-positive fix (`local-memory/redact.ts`) |
| **1.1g** | ✅ | `remember.redactLocal` optional pre-persist redaction |
| **1.1f** | ✅ | HTTP hardening: per-session registry, bearer auth on W/D tools, RL-4/RL-5, startup validation, security headers, body limit |
| **1.1b** | ✅ | Hybrid ranked search — local semantic rank + Walrus hydrate, scores + verifiable hits |
| **1.1e** | ✅ | Real version history — `versionHistory` metadata index + merged timeline |
| **1.1c** | ✅ | Layered verify — `verifyMemory` + `ChainReader` (pack/bounty/tx) + Walrus blob check |
| **1.1d** | ✅ | Lineage indexer — `lineageHistory` metadata + `getLineage` graph (local + on-chain pack) |

**v1 tool subset**: §5 marketplace/chain tools are registered in v2; v1 ships 9 hybrid/privacy tools only.

Package docs: `packages/mcp/README.md`, `packages/mcp/PROJECT.md`, `packages/mcp/docs/`.

---

## 16. Related specs

- [`openspec-memwal-agent-memory.md`](openspec-memwal-agent-memory.md) — master spec §7
- [`openspec-memory-sync-service.md`](openspec-memory-sync-service.md) — `MemorySyncService` API
- [`openspec-package-local-memory.md`](openspec-package-local-memory.md) — `LocalMemoryStore`
- [`openspec-agent-swarm-integration.md`](openspec-agent-swarm-integration.md) — hook ↔ tool parity
- [`openspec-move-contracts.md`](openspec-move-contracts.md) — bounty/marketplace PTB targets
- [`ADR-002`](../decisions/ADR-002.md), [`ADR-010`](../decisions/ADR-010.md)
