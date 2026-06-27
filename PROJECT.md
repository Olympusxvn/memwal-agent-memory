# PROJECT.md — MemWal Agent Memory

**Project**: `memwal-agent-memory`
**Repository**: https://github.com/Olympusxvn/memwal-agent-memory
**Track**: Sui Overflow 2026 — Walrus Track
**Mainnet package**: `0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050`

> Canonical references: [`docs/specs/openspec-memwal-agent-memory.md`](docs/specs/openspec-memwal-agent-memory.md) (master OpenSpec) · [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (system architecture)

---

## Vision

**MemWal Agent Memory** is a **hybrid verifiable memory layer** for autonomous AI agents. It
combines the **speed and privacy of local storage** with the **durability, verifiability, and
shareability of Walrus** — letting agents evolve beyond stateless, single-turn interactions.

Today's agents forget. Memory is locked inside one vendor's stack, and there is no trustworthy
way to prove *what* an agent learned, *when*, or to *share and monetize* that knowledge. We turn
memory into a **first-class, verifiable, ownable asset** and build a decentralized **Memory
Economy** on Sui & Walrus where agents can remember, recall, prove, trade, fork, and improve
knowledge.

**Value priority order**: **Verifiability › Privacy › Performance › Agent Autonomy.**

---

## Mission

Build the **best hybrid memory layer** for autonomous AI agents on the Sui & Walrus ecosystem —
making persistent, verifiable, and economically valuable memory accessible to **any
MCP-compatible agent** (Claude, Cursor, OpenClaw, custom).

---

## Core Focus

- **Hybrid Memory Architecture** — local-first (SQLite + vectors) for speed/privacy; durable
  promotion to **MemWal + Walrus** for verifiability and sharing.
- **Intelligent Sync** — `MemorySyncService` with a **Quality Gate + PII redaction** before any
  durable write, plus versioning, lineage, and predictable conflict resolution.
- **Memory Marketplace + Bounty + Royalty** — Sui Move contracts where agents discover,
  purchase, fork, improve, and monetize high-quality memories, with verifiable on-chain proof.
- **Universal Accessibility** — a **MCP Server** (stdio + Streamable HTTP) so any agent can use
  the memory layer without importing our packages.

---

## How It Works (at a glance)

```
external agents ──MCP──▶ packages/mcp ──▶ packages/core (sync · quality gate · redaction · lineage)
                                              │
                         packages/local-memory (fast, private)   packages/memwal-client ──▶ Walrus (durable, verifiable)
                                              │
                                   packages/sui-contracts (marketplace · bounty · royalty)
```

Demo north star: **bounty → acquire → improve → fork → payout**, where every claim traces to a
**Walrus blob id** or an **on-chain event**.

---

## Key Differentiators (vs. official MemWal)

Official MemWal gives you durable storage. MemWal Agent Memory gives agents a **living,
evolving, monetizable memory system**.

| Dimension | Official MemWal | MemWal Agent Memory |
|-----------|-----------------|---------------------|
| Storage model | Walrus-only (durable) | **Hybrid** (local SQLite + Walrus) |
| Privacy | Encryption | **Built-in Quality Gate + PII redaction** before upload |
| Memory evolution | Store / recall | **Versioning + lineage + forking** |
| Economy | None | **Marketplace + Bounty + Royalty** (incl. lineage royalty) |
| Accessibility | Library / OpenClaw | **Universal MCP Server** |
| Offline support | Limited | **Offline-first** with graceful, deferred sync |

We **wrap** the official MemWal SDK (never fork it) and extend it into a private-by-default,
tradable memory economy.

---

## Walrus Track Alignment

- **Durable storage on Walrus** — memories promoted via the official MemWal path land as Walrus
  blobs (`MemoryRecord.walrusBlobId`, `MemoryPack.blob_ids`).
- **Verifiable & recallable** — Proof-of-Availability + on-chain references; UI/scores trace to
  on-chain events, never pure self-report.
- **Privacy before upload** — redaction + quality gate enforced in the sync layer **and** at the
  MCP server boundary (cannot be bypassed by a client).
- **On-chain economy** — Move package (marketplace, bounty, royalty) with indexer-friendly
  events on **mainnet**.
- **Agentic web** — runnable hooks and an autonomous bounty-hunter flow demonstrate real
  agent-to-agent collaboration, not dead SDK imports.

### Shipped strengths (preserve — do not regress)

Post-submit work **extends** these; it does not replace the hybrid pipeline or judge offline path.

| Strength | Where |
|----------|--------|
| Hybrid local → redact → gate → Walrus | `MemorySyncService`, `pnpm agent:demo` |
| MCP universal access | `@memwalpp/mcp`, `pnpm mcp:e2e` |
| Layered verify + proof JSON | MCP `verify`, `search(includeProof)` |
| Mainnet Move economy | `packages/sui-contracts`, `pnpm contracts:info` |
| 2-agent bounty swarm | `pnpm agent:bounty-hunt` |
| Judge docs + Doc Hub | `JUDGE_GUIDE.md`, `/doc-hub/` |
| Long-running production proof | [special-one-agent](https://github.com/Olympusxvn/special-one-agent) — see [`docs/companion-mvp-special-one-agent.md`](docs/companion-mvp-special-one-agent.md) |

### Post-submit track gaps (Phases 10–17)

**Submitted** for Sui Overflow 2026 Walrus Track; development continues where ideas strengthen the
story for judges and follow-on programs.

| Gap | Track theme | Phase | Priority |
|-----|-------------|-------|----------|
| **A** | Multi-agent shared memory on Walrus | 11 | Tier A |
| **B** | Long-running workflows | 14 | Tier S + B |
| **C** | Artifact-driven (reports, JSON on Walrus) | 12 | Tier A |
| **D** | Intelligent upload decision v1 | 13 | Tier A |
| **E** | Verifiable + portable judge path | 12 | Tier A |
| **F** | Privacy / Seal trust model (docs) | 16 | Tier B |
| **G** | Dashboard Walrus metrics | 15 | Tier B |
| **H** | Benchmarks (local vs Walrus) | 15 | Tier B |

**Canonical plan:** [`docs/specs/openspec-walrus-track-gaps.md`](docs/specs/openspec-walrus-track-gaps.md)  
**Progress checklist:** [`docs/walrus-track-post-submit-checklist.md`](docs/walrus-track-post-submit-checklist.md)  
**Execution order:** Tier **S** (narrative) → Tier **A** (demos + MCP) → Tier **B** (polish).  
**Deferred:** zk-proof, full framework adapters, production indexer, MemWalManual wire-up — see spec §6.

---

## Success Metrics

- Working **hybrid sync** between local and Walrus (online + offline).
- Working **Memory Marketplace** with end-to-end bounty + royalty flow.
- **MCP Server** that external agents can discover and connect to.
- High-quality, judge-friendly **demo** (CLI + dashboard) with verifiable proofs.
- Clean, maintainable architecture with strong documentation.

---

## Non-Goals (current milestone)

- Forking the official MemWal SDK.
- A full decentralized indexer.
- AI training directly on memories.
- Mobile / embedded agent runtimes.
- Production multi-tenant hosting, full governance/DAO, or gas sponsorship.
- Bridged token economics (`WAL` here is a package-minted **demo coin**).

---

## Repository Map

| Path | Role |
|------|------|
| `packages/shared` | Pure types & constants (no I/O) |
| `packages/local-memory` | Local-first SQLite + vectors + quality scoring |
| `packages/memwal-client` | MemWal SDK facade + hooks (delegate signing) |
| `packages/core` | `MemorySyncService`, orchestration, lineage |
| `packages/mcp` | Universal MCP Server (stdio + HTTP) |
| `packages/sui-contracts` | Sui Move: marketplace, bounty, royalty |
| `apps/dashboard` | Marketplace UI + judge demo |
| `apps/agent-swarm` | Agent hooks + bounty-hunter demos |
| `apps/cli` | Operator / demo scripts |
| `docs/` | OpenSpecs, ADRs, architecture |

---

## Learn More

- **Master OpenSpec**: [`docs/specs/openspec-memwal-agent-memory.md`](docs/specs/openspec-memwal-agent-memory.md)
- **Walrus Track gaps (post-submit)**: [`docs/specs/openspec-walrus-track-gaps.md`](docs/specs/openspec-walrus-track-gaps.md) · [`docs/walrus-track-post-submit-checklist.md`](docs/walrus-track-post-submit-checklist.md)
- **MemWal / Walrus alignment backlog**: [`docs/walrus-memory-alignment.md`](docs/walrus-memory-alignment.md)
- **Architecture**: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **MCP Server**: [`docs/specs/openspec-mcp-server.md`](docs/specs/openspec-mcp-server.md)
- **Product MVP (Cursor + Claude)**: [`docs/specs/openspec-product-mvp-cursor-claude.md`](docs/specs/openspec-product-mvp-cursor-claude.md) · [`docs/product/README.md`](docs/product/README.md)
- **Move v2 Refactor**: [`docs/specs/openspec-move-contracts-refactor.md`](docs/specs/openspec-move-contracts-refactor.md)
- **Roadmap**: [`ROADMAP.md`](ROADMAP.md)
- **Decisions (ADRs)**: [`docs/decisions/`](docs/decisions/)
