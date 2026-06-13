# Project structure

**Repository:** [memwal-agent-memory](https://github.com/Olympusxvn/memwal-agent-memory)  
**Layout:** pnpm workspaces + Turborepo · **ADR:** [ADR-013](decisions/ADR-013.md)

---

## Tree (what matters)

```
memwal-agent-memory/
├── apps/                          # Runnable entrypoints (do not import from packages)
│   ├── agent-swarm/               # Judge demos: agent:demo, agent:bounty-hunt
│   ├── dashboard/                 # Next.js — Vercel live demo + /summary + /product
│   └── cli/                       # Thin ops / package info CLI
│
├── packages/                      # Libraries (dependency flows inward)
│   ├── shared/                    # Types only — no I/O
│   ├── local-memory/              # SQLite, redact, quality gate
│   ├── memwal-client/             # MemWal SDK facade → Walrus
│   ├── core/                      # MemorySyncService, agent bridge, hooks
│   ├── mcp/                       # MCP server (stdio) — judge: pnpm mcp:e2e
│   ├── ui/                        # Shared React components
│   └── sui-contracts/             # Move sources + sui move test
│
├── docs/                          # Human + judge documentation
│   ├── doc-map.html               # Judge doc hub (synced → dashboard /doc-hub)
│   ├── PROJECT-STRUCTURE.md       # This file
│   ├── ARCHITECTURE.md            # System design
│   ├── deploy.md                  # Mainnet IDs + PTBs
│   ├── specs/                     # OpenSpec feature contracts
│   ├── decisions/                 # ADRs
│   ├── product/                   # Post-hackathon MCP product
│   └── brand/                     # Logo assets (1:1 PNG/JPG)
│
├── scripts/                       # Demo runner, Move ops, video tooling
├── .github/workflows/ci.yml       # CI only (Move + JS) — see below
│
├── README.md                      # Contributor + judge entry
├── SUMMARY.md                     # Role & benefits (also /summary on dashboard)
├── SUBMISSION.md                  # Walrus track brief
└── JUDGE_GUIDE.md                 # 5–10 min verify path
```

**Not at repo root:** `tests/unit`, `tests/integration`, `tests/e2e` — tests live **next to the code** (see [Testing](#testing)).

---

## Package dependency rule

```
apps/*  →  packages/core, memwal-client, local-memory, shared, ui, mcp
packages/core  →  local-memory, memwal-client, shared
packages/memwal-client, local-memory  →  shared
packages/shared  →  (no workspace deps)
packages/sui-contracts  →  Move only (parallel to TS graph)
```

Apps **must not** be imported by `packages/*`.

---

## Apps

| App | Command | Role |
|-----|---------|------|
| `agent-swarm` | `pnpm agent:demo`, `pnpm agent:bounty-hunt` | Judge narrative; bounty **metadata stub**, sync path **real** |
| `dashboard` | `pnpm --filter @memwalpp/dashboard dev` | Live UI, kiosk PTBs, static `/summary`, `/product` |
| `cli` | `pnpm --filter memwalpp-cli` (if wired) | Package info / smoke |

---

## Packages

| Package | README | Tests folder |
|---------|--------|--------------|
| `shared` | — (types only) | — |
| `local-memory` | — | `tests/` |
| `memwal-client` | [README](../packages/memwal-client/README.md) | `tests/` |
| `core` | [README](../packages/core/README.md) | `tests/` |
| `mcp` | [README](../packages/mcp/README.md) | `test/` (incl. e2e) |
| `sui-contracts` | [README](../packages/sui-contracts/README.md) | `tests/*.move` |
| `ui` | — | — |

---

## Documentation map (read order)

| Audience | Start here |
|----------|------------|
| **Judges** | Live [doc-hub](https://memwalpp-dashboard.vercel.app/doc-hub/) · [doc-map.html](doc-map.html) → [JUDGE_GUIDE.md](../JUDGE_GUIDE.md) |
| **Anyone new** | [SUMMARY.md](../SUMMARY.md) · [live /summary](https://memwalpp-dashboard.vercel.app/summary) |
| **Contributors** | [README.md](../README.md) → [ARCHITECTURE.md](ARCHITECTURE.md) → [PROJECT.md](../PROJECT.md) |
| **On-chain** | [deploy.md](deploy.md) |
| **Workshop context** | [judge-walrus-memory-workshop.md](judge-walrus-memory-workshop.md) |
| **Walrus Memory backlog** | [walrus-memory-alignment.md](walrus-memory-alignment.md) |

Internal planning (`docs/process/plans/`, legacy `SOURCE-memwalpp.md`) — optional; not required for judges.

---

## CI / GitHub Actions

| Workflow | Needed? | Purpose |
|----------|---------|---------|
| **`ci.yml`** | **Yes** | `sui move test` + `pnpm test` + turbo `lint` / `check` / `build` |

---

## Testing

Tests are **colocated by package** (Vitest + Move), not split into a top-level `tests/` tree.

| Layer | Location | Command | What it proves |
|-------|----------|---------|----------------|
| **Unit** | `packages/*/tests/*.test.ts` | `pnpm test` | Sync, redact, MCP handlers, durable store |
| **Integration** | e.g. `memwal-client/tests/chain-ptb.test.ts`, `mcp/test/handlers.test.ts` | `pnpm test` | PTB wiring, tool handlers with mocks |
| **E2E (automated)** | `packages/mcp/test/e2e-stdio.test.ts` | `pnpm mcp:e2e` | Full MCP stdio: remember → recall |
| **E2E (manual / judge)** | `apps/agent-swarm` demos | `pnpm agent:demo`, `pnpm agent:bounty-hunt` | Hybrid hooks + multi-agent story |
| **Contracts** | `packages/sui-contracts/tests/` | `pnpm contracts:test` | Move modules (v1 + v2) |

**Do not add** empty `tests/unit`, `tests/integration`, `tests/e2e` at repo root — would duplicate CI and confuse contributors. If you add cross-package E2E later, use `e2e/` with one orchestrator script and document it here.

### Quick verify (maintainer)

```bash
pnpm test && pnpm mcp:e2e && pnpm contracts:test   # + Sui CLI for Move
pnpm check && pnpm build
```

See [judge-final-checklist.md](judge-final-checklist.md).

---

## Honest demo scope (stubs)

| Area | Status |
|------|--------|
| `MemorySyncService` → Walrus | **Real** when `MEMWAL_*` set |
| Move marketplace / bounty modules | **Real** on mainnet (see deploy.md) |
| `agent:bounty-hunt` bounty object | **Stub** metadata — not live escrow in demo CLI |
| `onTaskComplete` outcome | **Stub** event (ADR-005) |
| Kiosk listing indexer UI | **Placeholder** rows |

Stated in [SUBMISSION.md](../SUBMISSION.md) §4 and demo console output.
