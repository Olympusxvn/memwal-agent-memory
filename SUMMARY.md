# SUMMARY — MemWal Agent Memory

**One line:** A **hybrid, verifiable memory layer** and **memory economy** for AI agents — fast and private locally, durable and provable on **Walrus**, tradeable on **Sui**.

| | |
|---|---|
| **Repository** | https://github.com/Olympusxvn/memwal-agent-memory |
| **Hackathon** | [Sui Overflow 2026](https://overflow.sui.io) · [Walrus track](https://mystenlabs.notion.site/walrus-track-problem-statement) |
| **Live demo** | https://memwalpp-dashboard.vercel.app/ |
| **Summary (this page, live)** | https://memwalpp-dashboard.vercel.app/summary |
| **Judge quickstart** | [`JUDGE_GUIDE.md`](JUDGE_GUIDE.md) (5–10 min, no keys) |

---

## What is it?

**MemWal Agent Memory** lets autonomous agents **remember, recall, prove, share, and monetize** knowledge — without being locked to one app or losing context every session.

It **wraps** the official [MemWal](https://docs.memwal.ai/) SDK (Walrus Memory). It does **not** fork Mysten’s stack. It adds:

- **Local-first** speed and privacy (SQLite + vectors)
- **Controlled promotion** to Walrus (redaction + quality gates)
- **Sui Move** marketplace, bounties, and royalties
- **MCP** so Cursor, Claude, OpenClaw, or any MCP client can use the same layer

Display name **MemWal++** appears in some UI copy; the repository and package scope use **memwal-agent-memory** / `@memwalpp/*`.

---

## Role in the stack

Think of three layers:

```
┌─────────────────────────────────────────────────────────────┐
│  Experience — dashboard, wallet, marketplace UI             │
├─────────────────────────────────────────────────────────────┤
│  Agents — OpenClaw/NemoClaw hooks, swarm demos, MCP server  │
├─────────────────────────────────────────────────────────────┤
│  Hybrid memory — local store ◄──sync──► MemWal → Walrus     │
├─────────────────────────────────────────────────────────────┤
│  Sui Move — packs, marketplace, bounty escrow, royalties   │
└─────────────────────────────────────────────────────────────┘
```

| Layer | Role |
|-------|------|
| **Local memory** | Sub-millisecond recall, offline work, PII stays local until policy allows upload |
| **MemWal + Walrus** | Encrypted durable blobs, semantic recall, portable proof (`walrusBlobId`) |
| **Move contracts** | On-chain economy: list, buy, fork memory packs; post bounties; pay fulfillment tied to a Walrus blob |
| **MCP** | Universal API for external agents — no need to import monorepo packages |

**North-star story:** *bounty posted → hunter acquires memory → improves → forks → payout* — each step traceable to **local policy**, a **Walrus blob**, or an **on-chain event**.

---

## Who benefits?

### AI agents

- **Remember across sessions** without stuffing entire chat logs into every prompt
- **Recall by meaning** (semantic search), not only keywords
- **Work offline**, sync when credentials and quality rules allow
- **Collaborate** in multi-agent flows (poster + hunter bounty demo)

### Developers

- **Drop-in MCP** — `pnpm mcp:e2e` proves stdio tools without wallet setup
- **Hybrid sync** — `MemorySyncService` handles redact → gate → promote in one place
- **Mainnet Move** — marketplace and bounty modules already published (see [`docs/deploy.md`](docs/deploy.md))
- **Built on official workshop curriculum** — same `remember` / `recall` / namespaces as [Walrus Memory Workshop](https://mystenlabs.notion.site/Walrus-Memory-Workshop-Build-on-the-Memory-Layer-3666d9dcb4e9801dadb0e67ad368235e)

### Judges and reviewers

- **Runnable in minutes** — no API keys required for core path
- **Walrus on the critical path** — promotion → MemWal relayer → Walrus blob id on records and bounties
- **Clear docs** — this file, [`SUBMISSION.md`](SUBMISSION.md), [`docs/judge-walrus-memory-workshop.md`](docs/judge-walrus-memory-workshop.md)

### Ecosystem (Walrus / Sui)

- Shows **MemWal adoption** beyond a sample app: tooling, MCP, economy
- Connects **Agentic Web** agents to **verifiable data** (memory as an ownable asset, not opaque logs)

---

## Core benefits (why it matters)

| Benefit | What you get |
|---------|----------------|
| **Speed** | Local SQLite recall for day-to-day agent turns |
| **Privacy** | PII redaction and quality gate **before** anything hits Walrus |
| **Verifiability** | `walrusBlobId` on memory records; bounty fulfillment references on-chain blob ids |
| **Portability** | MemWal namespaces and Walrus blobs — not trapped in one vendor DB |
| **Economy** | Discover, buy, fork, and improve memories; royalties to original creators |
| **Accessibility** | MCP tools (`remember`, `recall`, `search`, `sync`, …) for any compatible client |
| **Judge-friendly** | Offline demos exit `0`; live Walrus is one `.env` block away |

**Priority order (project values):** Verifiability › Privacy › Performance › Agent autonomy.

---

## How it works (simple flow)

1. **Write locally** — agent or MCP stores a memory row in SQLite (fast, private).
2. **Gate** — `redactForUpstream` strips sensitive patterns; quality scorer decides if promotion is allowed.
3. **Promote** — `DurableMemoryStore` calls MemWal `remember` → relayer encrypts (SEAL) → blob on **Walrus**.
4. **Recall** — hybrid `pullQuery`: local hits first, durable semantic recall when online.
5. **Trade / bounty** — Move contracts link packs and escrow to Walrus-backed fulfillment.

Optional: OpenClaw-style hooks (`beforeRemember`, `afterThink`, `onTaskComplete`) inject and capture context in [`pnpm agent:demo`](package.json) and [`pnpm agent:bounty-hunt`](package.json).

---

## vs official MemWal alone

| | Official MemWal | MemWal Agent Memory |
|---|-----------------|---------------------|
| Storage | Walrus-centric | **Local + Walrus** hybrid |
| Before upload | Encryption | Encryption **+ redaction + quality gate** |
| Economy | None | **Marketplace, bounty, royalty** on Sui |
| Any agent | SDK / OpenClaw plugin | **+ MCP server** (stdio E2E) |
| Offline | Limited | **Offline-first** with deferred sync |

We are an **extension and economy layer**, not a replacement for [MystenLabs/MemWal](https://github.com/MystenLabs/MemWal).

---

## Walrus track fit

The [Walrus track](https://mystenlabs.notion.site/walrus-track-problem-statement) asks for persistent, verifiable agent memory and developer tooling. This project delivers:

- Long-term memory on **Walrus** via MemWal
- Multi-agent **bounty-hunter** narrative
- **MCP** integration for frameworks
- **Mainnet** Sui objects for marketplace and bounties

**Not in scope here:** DeFi risk guardian, DeepBook agent wallet, or NL→swap intent engine (those are [Agentic Web](https://mystenlabs.notion.site/agentic-web-problem-statement) sub-tracks). We complement Agentic Web by supplying the **memory and proof layer** agents need when they act over time.

---

## Verify in 5 minutes (judges)

```bash
git clone https://github.com/Olympusxvn/memwal-agent-memory.git
cd memwal-agent-memory
pnpm install && pnpm mcp:build && pnpm mcp:e2e && pnpm agent:demo && pnpm agent:bounty-hunt
```

| Result | Meaning |
|--------|---------|
| All commands exit `0` | Core integration works |
| `Not promoted (offline)` | Normal without MemWal credentials — **not a failure** |
| `✓ Promoted — blob 0x…` | Optional: set `MEMWAL_*` in [`.env.example`](.env.example) and `MEMWAL_AUTO_PUSH=1` |

Last maintainer smoke log: [`docs/judge-final-checklist.md`](docs/judge-final-checklist.md).

---

## Where to read next

| Audience | Document |
|----------|----------|
| **Judges** | [`JUDGE_GUIDE.md`](JUDGE_GUIDE.md) · [`SUBMISSION.md`](SUBMISSION.md) |
| **Workshop alignment** | [`docs/judge-walrus-memory-workshop.md`](docs/judge-walrus-memory-workshop.md) |
| **Repo layout** | [`docs/PROJECT-STRUCTURE.md`](docs/PROJECT-STRUCTURE.md) |
| **Architecture** | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [diagram SVG](docs/diagrams/memwalpp-merged-architecture.svg) |
| **Vision & goals** | [`PROJECT.md`](PROJECT.md) |
| **On-chain IDs** | [`docs/deploy.md`](docs/deploy.md) |
| **MCP setup** | [`docs/mcp-setup.md`](docs/mcp-setup.md) |
| **Product (Cursor/Claude)** | [`docs/product/README.md`](docs/product/README.md) |
| **Full README** | [`README.md`](README.md) |

---

## Acknowledgements

Built on **Sui**, **Walrus**, and **MemWal** (Mysten / Walrus Foundation), the [Walrus Memory Workshop](https://mystenlabs.notion.site/Walrus-Memory-Workshop-Build-on-the-Memory-Layer-3666d9dcb4e9801dadb0e67ad368235e), and open agent tooling ([MCP](https://modelcontextprotocol.io/), [NemoClaw](https://github.com/NVIDIA/NemoClaw)). AI-assisted development is disclosed in [ADR-012](docs/decisions/).
