# Streamable HTTP transport

`@memwalpp/mcp` implements the [MCP Streamable HTTP transport](https://modelcontextprotocol.io) for remote and shared deployments.

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/mcp` | JSON-RPC messages (initialize, tool calls) |
| `GET` | `/mcp` | SSE stream (server → client) |
| `DELETE` | `/mcp` | Terminate MCP session |
| `GET` | `/health` | Liveness probe (no auth) |
| `GET` | `/ready` | Readiness probe (no auth) |

---

## Starting the server

```bash
MCP_TRANSPORT=http \
MCP_HTTP_HOST=127.0.0.1 \
MCP_HTTP_PORT=8787 \
MCP_HTTP_TOKEN="$(openssl rand -hex 32)" \
pnpm --filter @memwalpp/mcp start
```

### Required when `MCP_HTTP_REQUIRE_AUTH=1` (default)

- `MCP_HTTP_TOKEN` or `MCP_BEARER_TOKEN` must be set — startup fails otherwise.

### Binding to all interfaces

```bash
MCP_HTTP_HOST=0.0.0.0 \
MCP_HTTP_ALLOWED_HOSTS=myhost.example,localhost \
MCP_HTTP_TOKEN=... \
MCP_TRANSPORT=http pnpm --filter @memwalpp/mcp start
```

Without `MCP_HTTP_ALLOWED_HOSTS`, startup fails when binding to `0.0.0.0` (DNS rebinding protection).

---

## Session lifecycle

1. Client sends `initialize` via `POST /mcp` (no `mcp-session-id` header).
2. Server creates a new MCP session: dedicated transport + rate limiter + tool handlers.
3. Server responds with `mcp-session-id` header.
4. Client includes `mcp-session-id` on all subsequent requests (POST, GET SSE, DELETE).
5. Client sends `DELETE /mcp` with session header to terminate (optional).

Each session is isolated — concurrent clients do not share state or rate limit buckets.

---

## Authentication

HTTP uses **Bearer token** auth for mutating and durable tools:

```
Authorization: Bearer <MCP_HTTP_TOKEN>
```

| Tool kind | Without bearer | With valid bearer |
|-----------|----------------|-------------------|
| Read (recall, search, getStats, …) | ✅ Allowed | ✅ Allowed |
| Mutate (remember, softDelete) | ❌ `-32001` | ✅ Allowed |
| Durable (sync) | ❌ `-32001` | ✅ Allowed |

Read tools work without auth so health checks and hybrid recall can run in semi-trusted networks. **Production deployments should use network isolation or require auth at the reverse proxy.**

---

## Client configuration

### OpenClaw

```jsonc
{
  "servers": {
    "memwal": {
      "url": "http://127.0.0.1:8787/mcp",
      "headers": {
        "Authorization": "Bearer your-token-here"
      }
    }
  }
}
```

### Programmatic (TypeScript SDK)

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const transport = new StreamableHTTPClientTransport(new URL("http://127.0.0.1:8787/mcp"), {
  requestInit: {
    headers: { Authorization: "Bearer your-token-here" },
  },
});

const client = new Client({ name: "my-agent", version: "1.0.0" });
await client.connect(transport);
const result = await client.callTool({ name: "recall", arguments: { query: "notes" } });
```

---

## Rate limiting

HTTP **always** enforces rate limits (OpenSpec RL-4):

| Bucket | Default | Applies to |
|--------|---------|------------|
| General | 60/min, burst 10 | Read + mutate tools |
| Durable | 10/min | `sync` |

Exceeded → JSON-RPC error `-32002` with `retryAfterMs`.

Limits are **per MCP session**, not global.

Configure via `MemWalMcpConfig.rateLimit` or extend env support in future releases.

---

## Body size limit

Default max JSON body: **256 KiB** (`MCP_HTTP_MAX_BODY_BYTES=262144`).

Oversized bodies are rejected by Express JSON parser before reaching MCP handlers.

---

## Security headers

All HTTP responses include:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Cache-Control: no-store`

---

## Reverse proxy (recommended for production)

Place nginx/Caddy/Traefik in front:

```nginx
location /mcp {
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_buffering off;          # required for SSE
    proxy_read_timeout 3600s;
}
```

Terminate TLS at the proxy. Keep the MCP process bound to localhost.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Startup: `MCP_HTTP_TOKEN required` | Auth on, no token | Set `MCP_HTTP_TOKEN` |
| `Session not found` (404) | Stale or invalid `mcp-session-id` | Re-initialize client |
| `Unauthorized` on remember/sync | Missing/wrong bearer | Add `Authorization: Bearer …` |
| `-32002` rate limit | Too many calls | Wait `retryAfterMs`, or tune limits |
| SSE disconnects | Proxy buffering | Disable buffering (see above) |
