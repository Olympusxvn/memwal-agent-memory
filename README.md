# MemWal Agent Memory

[![Sui Overflow 2026](https://img.shields.io/badge/Sui_Overflow-2026-6fbcff)](https://overflow.sui.io)
[![Walrus Track](https://img.shields.io/badge/Walrus-Track-4ade80)](https://mystenlabs.notion.site/walrus-track-problem-statement)
[![Sui](https://img.shields.io/badge/Sui-Chain-4DA2FF)](https://sui.io)
[![Walrus](https://img.shields.io/badge/Walrus-Storage-7C3AED)](https://www.walrus.xyz)
[![GitHub](https://img.shields.io/badge/GitHub-memwal--agent--memory-181717?logo=github)](https://github.com/Olympusxvn/memwal-agent-memory)
[![pnpm](https://img.shields.io/badge/pnpm-10.18-f69220?logo=pnpm&logoColor=white)](https://pnpm.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

**Hybrid agent memory: local-first speed + Walrus durable truth via MemWal + Sui Move marketplace.**

[![Submission ready](https://img.shields.io/badge/submission-ready-brightgreen)](SUBMISSION.md)

**New here?** Read **[`SUMMARY.md`](SUMMARY.md)** — role, benefits, and judge path in one page.

Built for **[Sui Overflow 2026](https://overflow.sui.io)** — **[Walrus track](https://mystenlabs.notion.site/walrus-track-problem-statement)**.

### For judges (5–10 min) — start here

```bash
git clone https://github.com/Olympusxvn/memwal-agent-memory.git
cd memwal-agent-memory
pnpm install && pnpm mcp:build && pnpm mcp:e2e && pnpm agent:demo && pnpm agent:bounty-hunt
```

| | |
|---|---|
| **Documentation hub (HTML)** | Live: [memwalpp-dashboard.vercel.app/doc-hub](https://memwalpp-dashboard.vercel.app/doc-hub/) · Repo: [`docs/doc-map.html`](docs/doc-map.html) |
| **Live demo (dashboard)** | https://memwalpp-dashboard.vercel.app/ |
| **Summary (live)** | https://memwalpp-dashboard.vercel.app/summary |
| **Runbook** | [`JUDGE_GUIDE.md`](JUDGE_GUIDE.md) |
| **Workshop → this repo (3 min read)** | [`docs/judge-walrus-memory-workshop.md`](docs/judge-walrus-memory-workshop.md) |
| **Brief** | [`SUBMISSION.md`](SUBMISSION.md) |
| **Walrus code path** | `packages/core/src/memory/memory-sync-service.ts` |

**Built on official Walrus Memory (MemWal)** from the [Overflow workshop](https://mystenlabs.notion.site/Walrus-Memory-Workshop-Build-on-the-Memory-Layer-3666d9dcb4e9801dadb0e67ad368235e); this repo adds hybrid local memory, MCP, and mainnet Move marketplace — you do **not** need the [workshop kit](https://github.com/DionisisLougaris/walrus-memory-workshop-kit) to score us.

No API keys required. Expect colored `[1/N]` steps and `── RESULT ── PASS`. Optional live Walrus: [`.env.example`](.env.example) + `MEMWAL_AUTO_PUSH=1` (mainnet relayer).

### Product — Cursor & Claude (post-hackathon)

**Project memory via MCP** — local-first, optional Walrus sync. Not the judge path.

| | |
|---|---|
| **Live intro (MCP product)** | https://memwalpp-dashboard.vercel.app/product |
| **Product guide** | [`docs/product/README.md`](docs/product/README.md) |
| **Landing (repo copy)** | [`docs/product/landing.html`](docs/product/landing.html) |
| **MVP spec** | [`docs/specs/openspec-product-mvp-cursor-claude.md`](docs/specs/openspec-product-mvp-cursor-claude.md) |
| **Claude instructions** | [`docs/product/claude-instructions.md`](docs/product/claude-instructions.md) |

## Contents

- [SUMMARY — role & benefits](SUMMARY.md)
- [For judges](#for-judges-5–10-min)
- [Product — Cursor & Claude](#product--cursor--claude-post-hackathon)
- [Overview](#overview)
- [Quick start](#quick-start)
- [Architecture](#architecture-at-a-glance)
- [On-chain package](#published-move-package-sui-mainnet)
- [Documentation](#documentation)
- [References](#references)
- [Walrus track checklist](#walrus-track-checklist)

---

## Overview

MemWal Agent Memory combines **Walrus + [Walrus Memory](https://docs.wal.app)** (durable, encrypted, verifiable recall) with **Sui Move** (MemoryPack-style NFTs, marketplace, bounties, royalties, delegate bridge) and **NemoClaw / OpenClaw** orchestration (hooks, skills, bounty agents). A **hybrid memory plane** keeps work **local-first** (fast recall, quality gates, PII redaction) and syncs upward only when memories meet policy — then **Walrus** holds the cryptographic truth judges can verify.

**Canonical architecture (merged, final):** [`docs/diagrams/memwalpp-merged-architecture.svg`](docs/diagrams/memwalpp-merged-architecture.svg)

**Full system write-up:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

Supplementary notes (original brief, mixed language): [`docs/SOURCE-memwalpp.md`](docs/SOURCE-memwalpp.md).

Cursor rules (always-on): [`.cursor/rules/memory-marketplace-rules.mdc`](.cursor/rules/memory-marketplace-rules.mdc) · [`.cursor/rules/memwal-agent-memory.mdc`](.cursor/rules/memwal-agent-memory.mdc)

---

## Architecture at a glance

The merged diagram defines **four vertical layers** (top to bottom):

| Layer | Responsibility |
|-------|----------------|
| **Experience** | Sui wallet, marketplace UI, dashboard — what users, developers, and judges touch. |
| **Orchestration** | **NemoClaw / OpenClaw** + **MCP Server** (`@memwalpp/mcp`) — sandboxed agent swarm, **MemWal plugin** (`oc-memwal`), **custom skills**, **before/after hooks**, **bounty skill**. |
| **Hybrid memory** | **Local:** SQLite + vectors, [agentmemory](https://github.com/rohitg00/agentmemory)-style curation, sub-5 ms recall, offline cache. **Durable:** MemWal SDK, **Seal**, PoA, namespaces, lineage — **bidirectional sync** when quality thresholds pass. |
| **Sui + Walrus** | **Move:** `memory_nft`, `marketplace`, `access_policy`, **Kiosk + royalties**, **WAL** settlement, **delegate bridge**; **bounty** module (escrow, on-chain requirements). **Walrus:** encrypted blobs, erasure coding, PoA, Seal key gating — persistence under MemWal. |

```mermaid
flowchart TB
  subgraph L1 [Experience]
    UI[Sui_Wallet_Marketplace_Dashboard]
  end
  subgraph L2 [Orchestration]
    SK[Custom_skills_Bounty_skill]
    HK[Hooks_before_after]
  end
  subgraph L3 [Hybrid_memory]
    LO[Local_SQLite_vec]
    DU[MemWal_Walrus_Seal]
    LO <-->|sync_on_threshold| DU
  end
  subgraph L4 [Chain_and_storage]
    MV[Move_marketplace_NFT_policy]
    BO[bounty_delegate_WAL]
    W[Walrus_blobs]
  end
  UI --> SK
  SK --> HK
  HK --> LO
  HK --> DU
  DU --> W
  MV --> BO
```

Project principles for Cursor agents live under **`.cursor/rules/`** — use **`memory-marketplace-rules.mdc`** as the primary always-on rule file.

---

## Demo data flow (judge narrative)

1. **Agent turn** — OpenClaw hooks — **local scoring** (agentmemory + memoirs-style adapters) — if quality passes — **push encrypted blob** via MemWal onto **Walrus**.
2. **Marketplace listing** — **Sui object** (MemoryPack / NFT-like) + **metadata on Walrus**.
3. **Bounty-hunter agent** — scan **on-chain bounties** — evaluate locally — acquire memory — integrate — improve — **fork** new version (**royalty** to original creator).
4. **Verification** — **cryptographic proof on Walrus** + **performance metrics** tied to on-chain events (see ADR-005 in `docs/decisions/`).

---

## Technology stack

| Layer | Technology | Role |
|-------|------------|------|
| Orchestration | [NVIDIA NemoClaw](https://github.com/NVIDIA/NemoClaw) + OpenClaw | Secure sandbox, swarm, policy, MemWal plugin |
| Durable memory | [MystenLabs / MemWal](https://github.com/MystenLabs/MemWal) + Walrus | Verifiable, shareable, encrypted agent memory |
| Local cache and scoring | [agentmemory](https://github.com/rohitg00/agentmemory), [memoirs](https://github.com/misaelzapata/memoirs) (adapters in-repo) | Quality gate, fast recall, PII redaction before sync |
| On-chain economy | Move in `packages/sui-contracts` | Bounty, royalty, MemoryPack NFT, marketplace, delegate bridge, access policy |
| Frontend | Next.js + `@mysten/dapp-kit` | Marketplace, Memory Kiosk, wallet |

Move listing patterns draw from community curriculum (e.g. [sui-move-intro-course](https://github.com/sui-foundation/sui-move-intro-course)) — extended here for **memory, bounty, and royalty** flows.

---

## Monorepo layout

```
memwal-agent-memory/
├── apps/dashboard/       # Next.js + dApp Kit
├── apps/agent-swarm/     # NemoClaw / OpenClaw runner
├── apps/cli/             # Optional PTB helpers
├── packages/core/
├── packages/local-memory/
├── packages/memwal-client/
├── packages/mcp/         # MCP Server (@memwalpp/mcp) — stdio + HTTP
├── packages/shared/      # Cross-cutting types (no I/O) — foundation package
├── packages/sui-contracts/
├── packages/ui/
├── contracts/            # Pointer to Move package
├── docs/                 # ARCHITECTURE.md, ADRs, specs, diagrams
├── openspec/
├── scripts/
└── .cursor/rules/        # memory-marketplace-rules.mdc, memwal-agent-memory.mdc
```

**Full tree + CI/testing map:** [`docs/PROJECT-STRUCTURE.md`](docs/PROJECT-STRUCTURE.md)

### Current structure (confirmed)

| Area | Status | Notes |
|------|--------|------|
| **Turborepo + pnpm** | Active | `turbo.json`, `pnpm-workspace.yaml`, root `package.json` |
| **Move contracts** | Published on mainnet | See package ID below; sources under `packages/sui-contracts` |
| **`@memwalpp/shared`** | Types expanded | `ObjectId`, `MemoryRecord`, `Bounty`, `AgentAction`, indexer rows — see `packages/shared/src/` |
| **Dashboard** | Scaffold | Next 15 + dApp Kit; wire env package ID |
| **MemWal client** | Active | `MemWalClient`, `DurableMemoryStore`, retries (Phase 2) |
| **Core sync** | Active | `MemorySyncService`, `MemWalAgentBridge` (Phase 2–3) |
| **Agent swarm** | Demo-ready | `pnpm agent:demo`, `pnpm agent:bounty-hunt` (offline-safe) |
| **Local memory** | Active | SQLite + in-memory; adapters for agentmemory / memoirs |
| **Indexer** | Schema only | `docs/specs/indexer-schema.sql` — wire a worker next |
| **OpenSpec / skills** | Present | `openspec/`, `.cursor/skills/`, `skills-lock.json` |

---

## Build order (recommended)

1. **`@memwalpp/shared`** — types and pure helpers (no dependencies). *Done as foundation.*
2. **`@memwalpp/ui`** — presentational components (depends on shared only where needed).
3. **`@memwalpp/memwal-client`** — MemWal + Walrus wrapper, hooks, `IMemWalAgent` (depends on shared).
4. **`@memwalpp/local-memory`** — SQLite + scoring adapters (depends on shared).
5. **`@memwalpp/core`** — marketplace / bounty / memory domain services (depends on client + shared).
6. **`packages/sui-contracts`** — `pnpm contracts:build` / `contracts:test` (Sui CLI).
7. **`apps/dashboard`** — Next build after upstream packages `check` clean.
8. **`apps/agent-swarm`** — runner + skills once client/core APIs stabilize.
9. **Indexer service** — consume Move events → Postgres → Kiosk API.
10. **E2E demo script** — `pnpm demo` proves Walrus + Sui + agent path for judges.

Within Turborepo, `build` / `check` chains follow **`^build` / `^check`** so upstream packages run first.

---

## Move contracts (Sui Mainnet) — Phase 3 ✓

| Field | Value |
|-------|--------|
| **Package ID** | `0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050` |
| **Suiscan** | [Package on mainnet](https://suiscan.xyz/mainnet/object/0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050) |
| **Shared Marketplace** | `0x7dea19c34022cc7d28d21bfef75859bd6704f8fbd9bc7ea00c787052f895d548` |
| **Deploy guide** | [`docs/deploy.md`](docs/deploy.md) |
| **OpenSpec** | [`docs/specs/openspec-move-contracts.md`](docs/specs/openspec-move-contracts.md) |

| Module | Capabilities |
|--------|----------------|
| `memory_nft` | Mint `MemoryPack` with Walrus `blob_ids`, royalty bps, delegate slot |
| `marketplace` | List / buy / cancel — WAL payment + 2.5% fee + creator royalty |
| `bounty` | **WAL escrow** — post, submit Walrus fulfillment, approve / refund |
| `delegate_bridge` | Rotate `memwal_delegate` after ownership transfer |
| `access_policy` | Delegate-only Seal approval event |
| `wal` | Package-local demo `WAL` coin (`TreasuryCap` at publish) |
| `royalty` | Fee / royalty basis-point helpers |

```bash
pnpm contracts:build
pnpm contracts:test
pnpm contracts:info    # print package ID + PTB target examples
```

**WAL note:** package-minted **demo `WAL`** — not ecosystem WAL unless bridged ([`docs/deploy.md`](docs/deploy.md)).

---

## Quick start

**Requirements:** Node.js 20+, pnpm 10 · [Sui CLI](https://docs.sui.io/guides/developer/getting-started/sui-install) for contracts only

### Judge path (~3 minutes, no secrets)

```bash
pnpm install
pnpm mcp:build           # build the MCP server
pnpm mcp:e2e             # stdio client → remember/recall (MCP verification)
pnpm agent:demo          # hybrid memory + hooks (offline OK)
pnpm agent:bounty-hunt   # poster + hunter swarm
```

Expected: each step prints colored output ending in a `── RESULT ──` summary, **exit 0**. (Same steps as the "For judges" one-liner at the top.)

### Developer path

```bash
pnpm install
cp .env.example .env      # optional: MEMWAL_* for live Walrus blob ids
pnpm contracts:build
pnpm contracts:test
pnpm check
pnpm build
pnpm --filter @memwalpp/core test
```

### Live Walrus promotion (optional)

```bash
# .env — delegate key only (ADR-002); never commit
MEMWAL_PRIVATE_KEY=...
MEMWAL_ACCOUNT_ID=...
MEMWAL_SERVER_URL=https://relayer.memory.walrus.xyz   # mainnet relayer (see .env.example)
MEMWAL_AUTO_PUSH=1 pnpm agent:bounty-hunt
```

When live, demos print **Walrus blob refs** on `MemoryRecord.walrusBlobId` after `pushOne`.

### Dashboard

```bash
pnpm --filter dashboard dev
```

Copy [`.env.example`](.env.example) → `.env` / `.env.local`. Package ID is pre-filled for mainnet.

**Indexer schema:** [`docs/specs/indexer-schema.sql`](docs/specs/indexer-schema.sql)

---

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm contracts:build` | `sui move build` |
| `pnpm contracts:test` | `sui move test` |
| `pnpm build` | Turborepo build |
| `pnpm check` | Typecheck / lint |
| `pnpm demo` | `scripts/demo-runner.ts` |
| `pnpm agent:demo` | Offline-safe hybrid memory hook demo (`apps/agent-swarm`) |
| `pnpm agent:bounty-hunt` | Two-agent bounty flow (poster → hunter → sync) |
| `pnpm contracts:info` | Deployed Move package IDs + PTB targets |
| `pnpm mcp:build` | Build MCP server (`packages/mcp`) |
| `pnpm mcp:start` | Run MCP stdio server (builds first) |
| `pnpm mcp:e2e` | E2E test: stdio client → remember/recall |

---

## Documentation

| Path | Content |
|------|---------|
| [`docs/doc-map.html`](docs/doc-map.html) | **Judge documentation hub** — live: [/doc-hub](https://memwalpp-dashboard.vercel.app/doc-hub/) · verify, scoring lens, diagrams |
| [`SUMMARY.md`](SUMMARY.md) | Role, benefits, who it’s for |
| [`PROJECT.md`](PROJECT.md) | Vision, goals, non-goals |
| [`ROADMAP.md`](ROADMAP.md) | Phased milestones + current status |
| [`docs/PROJECT-STRUCTURE.md`](docs/PROJECT-STRUCTURE.md) | **Repo tree**, package DAG, CI, colocated tests |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | **Canonical** layered architecture + flows |
| [`docs/specs/openspec-memwal-agent-memory.md`](docs/specs/openspec-memwal-agent-memory.md) | **Master project OpenSpec** |
| [`docs/mcp-setup.md`](docs/mcp-setup.md) | **MCP E2E setup** (Cursor / Claude Desktop) |
| [`docs/specs/openspec-mcp-server.md`](docs/specs/openspec-mcp-server.md) | MCP Server OpenSpec |
| [`docs/specs/openspec-move-contracts-refactor.md`](docs/specs/openspec-move-contracts-refactor.md) | Move v2 refactor OpenSpec |
| [`docs/decisions/`](docs/decisions/) | ADR-001 through **ADR-013** (monorepo boundaries) |
| [`docs/GIT-AND-VERSIONING.md`](docs/GIT-AND-VERSIONING.md) | Branch + tag + version policy |
| [`docs/CLAUDE.md`](docs/CLAUDE.md) | Commands and guardrails for AI assistants |
| [`docs/diagrams/memwalpp-merged-architecture.svg`](docs/diagrams/memwalpp-merged-architecture.svg) | Merged architecture diagram |
| [`docs/SOURCE-memwalpp.md`](docs/SOURCE-memwalpp.md) | Original planning notes (legacy name) |
| [`docs/specs/indexer-schema.sql`](docs/specs/indexer-schema.sql) | Kiosk / marketplace indexer DDL |
| [`.cursor/rules/memory-marketplace-rules.mdc`](.cursor/rules/memory-marketplace-rules.mdc) | Primary Cursor project rules |
| [`openspec/README.md`](openspec/README.md) | Pointer: specs live under `docs/specs/` |
| [`JUDGE_GUIDE.md`](JUDGE_GUIDE.md) | **5–10 min judge runbook** |
| [`docs/judge-walrus-memory-workshop.md`](docs/judge-walrus-memory-workshop.md) | Official workshop → this submission (judge map) |
| [`docs/judge-final-checklist.md`](docs/judge-final-checklist.md) | Maintainer verification log (smoke tests) |
| [`SUBMISSION.md`](SUBMISSION.md) | **Final submission brief** (Walrus value + why win) |
| [`CHANGELOG.md`](CHANGELOG.md) | Notable changes and operational notes |

---

## References

External links and key in-repo docs for hackathon citation, judges, product MCP, and on-chain verification.

### Hackathon & Walrus track

| Resource | URL |
|----------|-----|
| Sui Overflow 2026 | https://overflow.sui.io |
| Walrus track problem statement | https://mystenlabs.notion.site/walrus-track-problem-statement |
| Walrus | https://www.walrus.xyz |
| Sui | https://sui.io |

### Walrus Memory workshop (official curriculum we built on)

| Resource | URL |
|----------|-----|
| Workshop guide (Notion) | https://mystenlabs.notion.site/Walrus-Memory-Workshop-Build-on-the-Memory-Layer-3666d9dcb4e9801dadb0e67ad368235e |
| Workshop hands-on kit | https://github.com/DionisisLougaris/walrus-memory-workshop-kit |
| Kit `SKILL.md` (SDK reference) | https://github.com/DionisisLougaris/walrus-memory-workshop-kit/blob/main/SKILL.md |
| Workshop closing survey | https://docs.google.com/forms/d/e/1FAIpQLSdNxVFuVipZVjzZH2YDqvf8794i8mFgbXQ2mw9XvgwXNElj6Q/viewform |
| Workshop recording (~90 min) | https://www.youtube.com/watch?v=GncjVUEJw9Y |
| Walrus Memory 101 slides | https://drive.google.com/file/d/1x4QePXh_8q7Gc9CBDAvtWq5axSMJFK2H/view |
| **Judge map (kit → this repo)** | [`docs/judge-walrus-memory-workshop.md`](docs/judge-walrus-memory-workshop.md) |

### Live demos & product (Cursor / Claude)

| Resource | URL |
|----------|-----|
| Dashboard (live demo) | https://memwalpp-dashboard.vercel.app/ |
| **MCP product intro** | https://memwalpp-dashboard.vercel.app/product |
| GitHub repository | https://github.com/Olympusxvn/memwal-agent-memory |
| Demo video (repo) | [`docs/memwalpp-demo.mp4`](docs/memwalpp-demo.mp4) |

### Repository — start here

| Doc | Purpose |
|-----|---------|
| [`SUMMARY.md`](SUMMARY.md) | Role, benefits, one-page overview |
| [`JUDGE_GUIDE.md`](JUDGE_GUIDE.md) | 5–10 min judge runbook (no keys) |
| [`docs/judge-walrus-memory-workshop.md`](docs/judge-walrus-memory-workshop.md) | Workshop curriculum → this submission |
| [`SUBMISSION.md`](SUBMISSION.md) | Walrus track submission brief |
| [`PROJECT.md`](PROJECT.md) | Vision, goals, non-goals |
| [`ROADMAP.md`](ROADMAP.md) | Phase status |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Canonical architecture |
| [`docs/deploy.md`](docs/deploy.md) | Mainnet deploy + PTB + v2 object IDs |
| [`docs/product/README.md`](docs/product/README.md) | Product: Pro Local vs + Walrus Sync |
| [`docs/specs/openspec-product-mvp-cursor-claude.md`](docs/specs/openspec-product-mvp-cursor-claude.md) | Post-hackathon MCP product spec |

### MemWal & Walrus (official — wrapped via `@memwalpp/memwal-client`)

| Resource | URL |
|----------|-----|
| Walrus Memory docs | https://docs.wal.app |
| Walrus Memory LLM index | https://docs.wal.app/llms.txt |
| Alignment backlog (P2/P3) | [`docs/walrus-memory-alignment.md`](docs/walrus-memory-alignment.md) |
| MemWal GitHub | https://github.com/MystenLabs/MemWal |
| npm SDK | `@mysten-incubation/memwal` |
| OpenClaw plugin | `@mysten-incubation/oc-memwal` — [MemWal README](https://github.com/MystenLabs/MemWal#openclaw--nemoclaw-plugin) |

### Agents, orchestration & MCP

| Resource | URL |
|----------|-----|
| Model Context Protocol | https://modelcontextprotocol.io/ |
| Cursor MCP docs | https://cursor.com/docs/mcp |
| Cursor MCP install links | https://cursor.com/docs/mcp/install-links |
| NVIDIA NemoClaw | https://github.com/NVIDIA/NemoClaw |
| MCP setup (this repo) | [`docs/mcp-setup.md`](docs/mcp-setup.md) |
| MCP OpenSpec | [`docs/specs/openspec-mcp-server.md`](docs/specs/openspec-mcp-server.md) |
| Claude project instructions | [`docs/product/claude-instructions.md`](docs/product/claude-instructions.md) |

### Local memory & Move learning

| Resource | URL |
|----------|-----|
| agentmemory | https://github.com/rohitg00/agentmemory |
| memoirs | https://github.com/misaelzapata/memoirs |
| Sui Move intro course | https://github.com/sui-foundation/sui-move-intro-course |

### Sui mainnet (published package)

| Item | Link |
|------|------|
| Package (original) | `0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050` |
| Suiscan | https://suiscan.xyz/mainnet/object/0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050 |
| Published-at (v3 PTBs) | `0x9de4c63e976b5244fc7a5378134c9a87030ef534491f8a6919698e7379a2b711` |
| Marketplace v1 | `0x7dea19c34022cc7d28d21bfef75859bd6704f8fbd9bc7ea00c787052f895d548` |
| Config v2 | `0x52ea5aa40b38de760c3faa08bd83cd047e4d63023091f14774a8a87609f0ecd1` |
| MarketplaceV2 | `0xfaddc1f4fe0f82a84d885b47a1202e37dc8f0a87040a7df7ff3e4268566c488f` |
| v2 bootstrap tx | https://suiscan.xyz/mainnet/tx/BjV2Q8mCarkmtENT1T3SPncKAFP3qNHQKVJ2DgptUnkW |

### Tooling

| Tool | URL |
|------|-----|
| Sui documentation | https://docs.sui.io/ |
| Turborepo | https://turbo.build/repo/docs |
| pnpm | https://pnpm.io/ |

---

## Walrus track checklist

- Walrus and MemWal on the **critical demo path** (blobs, PoA, recall).
- Sui contracts and events **visible** in explorer and/or indexer-driven UI.
- Agent story shows **integration**, not unused imports.
- **AI-assisted development** disclosed per hackathon rules and ADR-012.

---

## Security

Use **MemWal delegate keys** only. Never commit owner keys. Keep secrets in local env or CI vaults.

---

## License

[MIT](LICENSE)

---

## Acknowledgements

Mysten Labs (Sui, Walrus, MemWal, Seal), Sui Overflow 2026, and the projects listed in [References](#references). We **wrap** the official MemWal SDK — we do not fork it.

---

<p align="center"><strong>MemWal Agent Memory</strong> — Hybrid verifiable memory for autonomous agents on Sui and Walrus</p>
