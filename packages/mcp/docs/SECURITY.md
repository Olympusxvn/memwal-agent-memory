# Security

Security controls for `@memwalpp/mcp` — aligned with OpenSpec §8 (S-1…S-5) and phase **1.1f** HTTP hardening.

---

## Threat model (v1)

| Threat | Mitigation |
|--------|------------|
| PII uploaded to Walrus | Server-side redaction on sync (unskippable); optional `redactLocal` |
| Client bypasses redaction/quality gate | `validate` middleware rejects bypass flags (`-32602`) |
| Owner key exfiltration via MCP env | Startup refuses `MEMWAL_OWNER_KEY` / `SUI_OWNER_PRIVATE_KEY` (ADR-002) |
| Unauthorized memory writes over HTTP | Bearer auth on mutate/durable tools (`-32001`) |
| DoS via tool spam | Per-session token-bucket rate limits on HTTP (`-32002`) |
| DNS rebinding on localhost | Host header validation (SDK + custom allowedHosts for `0.0.0.0`) |
| Memory content in logs | Logger emits metadata only — no raw `content` |

---

## S-1 — Unskippable privacy gate

The MCP layer **never** accepts parameters that skip redaction or quality scoring:

```
skipRedaction, skipGate, bypassRedaction, rawContent, unredacted, …
```

Redaction logic lives in `@memwalpp/local-memory` — MCP delegates via `MemorySyncService.pushOne()`.

### Default redaction timing

| Path | When redaction runs |
|------|---------------------|
| `remember()` default | On `sync` (durable promotion) |
| `remember({ redactLocal: true })` | Before SQLite persist |

---

## S-5 — Authorization

### stdio

Single trusted local client. No bearer token. Mutating tools always allowed.

### HTTP

| Session state | Read tools | Mutate / durable |
|---------------|------------|------------------|
| `authorized: false` | ✅ | ❌ `-32001` |
| `authorized: true` | ✅ | ✅ |

Authorization is derived from:

```
Authorization: Bearer <MCP_HTTP_TOKEN>
```

Token must match server config exactly.

---

## ADR-002 — Delegate keys only

At startup, `assertNoOwnerKeys()` throws if:

- `MEMWAL_OWNER_KEY`
- `SUI_OWNER_PRIVATE_KEY`

are set. MCP servers must use **delegate keys** from a secret store, not hot owner keys.

---

## HTTP hardening (1.1f)

| Control | Implementation |
|---------|----------------|
| Per-session isolation | `HttpSessionRegistry` — one transport per MCP session |
| Startup validation | Token required when `requireAuth`; allowedHosts for `0.0.0.0` |
| Rate limits | `forceRateLimit: true` on HTTP sessions — cannot disable |
| Body limit | Express JSON parser with `MCP_HTTP_MAX_BODY_BYTES` |
| Security headers | `http-security.ts` on all responses |
| Safe logging | `logger.ts` — correlation id, no content bodies |

---

## Rate limiting (RL-1 … RL-5)

| ID | Policy |
|----|--------|
| RL-1 | Token bucket: 60/min general, burst 10 |
| RL-2 | Durable sub-limit: 10/min for `sync` |
| RL-3 | Error `-32002` + `retryAfterMs` |
| RL-4 | stdio may disable; HTTP **never** |
| RL-5 | Per session id (HTTP) or per process (stdio) |

---

## Deployment recommendations

1. Bind to `127.0.0.1` unless remote access is required.
2. Use a strong random `MCP_HTTP_TOKEN` (≥ 32 bytes hex).
3. Terminate TLS at reverse proxy; do not expose plain HTTP publicly.
4. Set `MCP_HTTP_ALLOWED_HOSTS` when binding `0.0.0.0`.
5. Monitor `/health` for session count anomalies.
6. Never commit tokens or delegate keys to git.

---

## Error codes (security-related)

| Code | HTTP status | Meaning |
|------|-------------|---------|
| `-32001` | 401 / tool error | Unauthorized session |
| `-32002` | tool error | Rate limited |
| `-32602` | tool error | Invalid params / bypass attempt |
| `-32000` | 400 | Bad MCP session / protocol error (SDK) |

---

## Reporting

Security issues for the parent project: see repository `SECURITY.md` or open a private advisory on GitHub.
