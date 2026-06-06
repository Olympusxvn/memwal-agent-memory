# Walrus Memory alignment — backlog (P2 / P3)

**Status:** Reference for post-hackathon work. P0–P1 items are implemented in repo + judge docs.

**Official docs:** [Walrus Memory on docs.wal.app](https://docs.wal.app) · LLM index: [llms.txt](https://docs.wal.app/llms.txt)

---

## Completed (P0–P1)

| Item | Where |
|------|--------|
| URL migration (`memory.walrus.xyz` relayer/dashboard) | `.env.example`, judge docs |
| SDK `@mysten-incubation/memwal` ^0.0.7 + object-style `recall` | `packages/memwal-client` |
| Dual MCP positioning | `docs/product/README.md`, `docs/judge-walrus-memory-workshop.md` |
| `restore` smoke | `pnpm memwal:restore-smoke`, `JUDGE_GUIDE.md` Path B+ |

---

## P2 — Demo UX & trust model (document only)

### Async remember latency

Walrus Memory `remember` is async (embedding + Seal + Walrus upload). Recall immediately after remember often returns empty for **5–15 seconds**.

| Mitigation | Status |
|------------|--------|
| `MEMWAL_WAIT_FOR_REMEMBER=1` blocks until `blob_id` | Supported in `.env.example` |
| Demo logs “waiting for blob…” | Partial — improve agent-swarm step 3 copy |
| MCP tool hint after `remember` | Backlog |

### Trust model (for SUBMISSION / judges)

| Mode | Trust boundary | This repo |
|------|----------------|-----------|
| **Managed relayer** | Walrus Foundation sees plaintext during embed/encrypt | Default live path after **local redact** |
| **MemWalManual** | Relayer sees only encrypted payloads + vectors | Not wired — privacy-max path |
| **Self-hosted relayer** | Your infra | Not in demo |
| **TEE relayer** | Attested enclave | Not in demo |

**Pitch line:** Local PII gate → then managed Walrus Memory relayer. On-chain ownership/delegates remain trustless via Sui `memwal:account`.

---

## P2 — SDK surface gaps (optional)

| Walrus Memory API | In `@memwalpp/memwal-client` | Notes |
|-------------------|------------------------------|-------|
| `analyze()` / `analyzeAndWait()` | No facade yet | Workshop “reading tracker” pattern |
| `ask()` | No | RAG over memories |
| `withMemWal` AI middleware | No | Dashboard chat |
| `compatibility()` | SDK auto-probes on signed requests | No explicit export |
| Streamable HTTP MCP `/api/mcp` | No | Use official `memwal-mcp` for remote HTTP |

---

## P2 — OpenClaw plugin alignment

Official [`@mysten-incubation/oc-memwal`](https://www.npmjs.com/package/@mysten-incubation/oc-memwal) provides:

- `before_prompt_build` auto-recall + injection guards
- `agent_end` auto-capture via `analyze()`
- `<memwal-memories>` tag stripping (feedback-loop prevention)
- Per-agent namespace from `sessionKey`

**This repo:** `createMemWalSwarmHooks` in `packages/core` covers recall/capture for judge demos but lacks injection filters.

**Backlog:** Wrap or port `oc-memwal` hooks; keep Move economy in `agent-swarm` orchestration.

---

## P3 — Indexer kiosk worker

| Layer | Purpose | Status |
|-------|---------|--------|
| Mysten indexer | `AccountCreated`, delegate cache, `vector_entries` for relayer | External (Walrus Foundation) |
| **Our indexer** | Marketplace + bounty Move events → Postgres | Schema only: `docs/specs/indexer-schema.sql` |
| Dashboard kiosk UI | Listings from indexer | Placeholder rows |

**Backlog:** Sui event worker → Postgres → wire `apps/dashboard` kiosk page.

---

## P3 — Infra & product

- Self-hosted relayer runbook for enterprise (link official [self-hosting](https://docs.wal.app))
- `npx @memwalpp/mcp` publish ([npm-publish.md](product/npm-publish.md))
- Kiosk listing indexer E2E test once worker exists

---

## URL reference (canonical)

| Resource | Production (mainnet) | Staging (testnet) |
|----------|----------------------|-------------------|
| Relayer | `https://relayer.memory.walrus.xyz` | `https://relayer-staging.memory.walrus.xyz` |
| Dashboard | `https://memory.walrus.xyz` | `https://staging.memory.walrus.xyz` |
| Official MCP | `npx -y @mysten-incubation/memwal-mcp --prod` | `--staging` |
| Our MCP | `pnpm mcp:e2e` (hybrid + chain tools) | same |

Legacy `*.memwal.ai` hosts may redirect; prefer `*.memory.walrus.xyz` in new configs.
