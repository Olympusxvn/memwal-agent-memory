# MemWal++ — PROJECT

**Track:** Sui Overflow 2026 — Walrus Specialized + Agentic Web  
**Codename:** MemWal++ (Memory Marketplace + bounty agents)

## Vision

Build a **decentralized, verifiable memory marketplace** where autonomous agents can **capture, score, persist, trade, and prove** memories — combining **local-first** speed and privacy with **MemWal + Walrus** durability and **Sui Move** for ownership, marketplace mechanics, bounties, and royalties.

## Goals

- **Verifiable scoring:** UI-facing quality metrics trace to **on-chain / indexed** evidence (ADR-005), not self-signed SQLite only.
- **Hybrid memory:** `local-memory` for fast path + policy; `memwal-client` for MemWal/Walrus promotion when gates pass (ADR-010).
- **Agent-ready:** NemoClaw / OpenClaw hooks and skills in `apps/agent-swarm` using stable TS contracts (`IMemWalAgent`, package facades).
- **Hackathon-grade repo:** `pnpm` + Turbo, CI green on PR, ADRs for anything judges or collaborators would question.

## Non-goals (v1 hackathon scope)

- Replacing Mysten MemWal or forking the relayer protocol implementation.
- Full production indexer + multi-region Walrus operations (schema and paths exist; scale-out deferred).
- Custodial wallet or centralized custody of user **owner** keys (delegate / demo keys only in env).

## Stack (authoritative)

- **Monorepo:** pnpm workspaces + Turborepo (`ADR-013`).
- **Chain / storage:** Sui Move (`packages/sui-contracts`), Walrus via MemWal narrative, Seal where specified in ADRs.
- **Agents:** OpenClaw / NemoClaw (install out-of-repo); this repo supplies hooks, skills, and demo flows.

## Where to read next

| Artifact | Purpose |
|----------|---------|
| [`ROADMAP.md`](ROADMAP.md) | Phased milestones + exit criteria |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Layers, data flow, diagram links |
| [`docs/decisions/`](docs/decisions/) | ADR-001 … ADR-013 |
| [`docs/CLAUDE.md`](docs/CLAUDE.md) | Commands + constraints for AI assistants |
| [`docs/GIT-AND-VERSIONING.md`](docs/GIT-AND-VERSIONING.md) | Branches + tags + package versions |

## Secrets policy

- **Never** commit private keys, MemWal delegate keys, or “hackathon key” markdown from local machines.
- Use **`.env`** (gitignored) and **`.env.example`** (placeholders only). See ADR-002.
