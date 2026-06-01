# OpenSpec: MemWal Agent Memory
**Project**: memwal-agent-memory  
**Version**: 1.0  
**Date**: May 31, 2026  
**Track**: Sui Overflow 2026 - Walrus Track

## 1. Project Overview & Vision

MemWal Agent Memory is a **hybrid verifiable memory layer** for autonomous AI agents, combining the speed and privacy of local storage with the durability, verifiability, and shareability of Walrus.

**The Problem**: Current AI agents are stateless and forget everything between sessions. Cloud-based memory solutions compromise privacy, lack verifiability, and create vendor lock-in.

**The Vision**: Create a decentralized **Memory Economy** where agents can persistently remember, share, improve, fork, and monetize knowledge in a verifiable way — turning one-time agents into evolving, collaborative, and economically valuable entities.

**Value Priority Order**:
1. Verifiability
2. Privacy
3. Performance
4. Agent Autonomy

## 2. Core Objectives

| ID | Objective | Walrus Track Alignment | Acceptance Rule |
|----|-----------|------------------------|-----------------|
| O1 | Hybrid Local + Walrus memory with intelligent sync | Durable & Verifiable Storage | Runnable `pnpm agent:demo` showing local ↔ Walrus sync with blob ID |
| O2 | Built-in Privacy & Quality Gate (redact + score) | Privacy-first | All memories pushed to Walrus must pass redaction |
| O3 | Decentralized Memory Marketplace + Bounty System | Programmable & Economic Layer | Agents can post/redeem bounty and receive royalty |
| O4 | MCP Server for universal agent access | Ecosystem Enablement | External agents can discover and use memory via MCP |
| O5 | Verifiable memory lineage & forking | Object-centric model | Memory can be forked with on-chain proof |
| O6 | Production-grade agent hooks & swarm demo | Agentic Web | `pnpm agent:bounty-hunt` demonstrates full flow |

## 3. Key Differentiators vs Official MemWal

| Feature | Official MemWal | MemWal Agent Memory |
|---------|-----------------|---------------------|
| Storage Model | Walrus-only | **Hybrid** (Local SQLite + Walrus) |
| Privacy | Encryption | **Built-in Quality Gate + Redaction** |
| Memory Evolution | Basic | **Lineage + Forking + Versioning** |
| Economy | None | **Memory Marketplace + Bounty + Royalty** |
| Accessibility | OpenClaw only | **MCP Server** (universal) |
| Offline Support | Limited | **Offline-first** with graceful sync |

**One-line Differentiator**: Official MemWal gives you storage. MemWal Agent Memory gives agents a **living, evolving, monetizable memory system**.

## 4. High-Level Architecture

**Layered Model**:

- **Layer A**: Local Memory (SQLite + agentmemory + memoirs)
- **Layer B**: Hybrid Sync Engine + Quality Gate
- **Layer C**: MemWal Client + Walrus Blobs
- **Layer D**: Sui Move Marketplace & Bounty
- **Layer X**: MCP Server + Agent Hooks (OpenClaw / external)

**ADR-013**: Strict acyclic dependency between packages.  
**ADR-010**: Hybrid sync rule — Local is source of truth for speed/privacy, Walrus is source of truth for durability/verifiability.

## 5. Core Components

- `packages/shared` — Types, constants, utilities
- `packages/local-memory` — SQLite + InMemory + Quality Gate
- `packages/memwal-client` — Thin MemWal adapter
- `packages/core` — MemorySyncService, business logic
- `packages/sui-contracts` — Move modules (marketplace, bounty, royalty)
- `packages/agent` — Bridge, hooks, swarm logic
- `packages/mcp` — MCP Server implementation
- `apps/dashboard` — Judge-friendly landing + demo UI

## 6. Memory Marketplace & Bounty System

**Functional Requirements** (MK = Marketplace, BN = Bounty):
- MK-1: Agents can list/improve/fork memories
- MK-2: Verifiable memory packs with lineage
- BN-1: Post bounty for specific knowledge
- BN-2: Autonomous hunter agents can fulfill bounties
- BN-3: Royalty distribution on forks/improvements

**Autonomous Flow**: Post Bounty → Hunter discovers → Pull memory → Improve → Push new version → Payout + Royalty

## 7. MCP Server Integration

- Expose tools: remember, recall, search, sync, getLineage, createBounty, etc.
- Support stdio + HTTP transport
- Privacy enforced at server level
- Full discoverability for any MCP client

## 8. Sui Move Contracts Structure

**Mainnet Package**: `0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050`

**Key Modules**: memory, marketplace, bounty, royalty, events, admin.

## 9. Non-Goals

- Building a full decentralized indexer
- Forking the official MemWal SDK
- Mobile/embedded agent support
- AI training directly on memories
- Full decentralized governance
- Gas sponsorship system
- Advanced analytics dashboard
- Production multi-tenant hosting

## 10. Success Criteria for Walrus Track

- Runnable end-to-end demo: bounty → acquire memory → improve → fork → payout with on-chain proof
- Clear hybrid architecture with verifiable Walrus blobs
- MCP accessibility demonstrated
- Strong judge experience (clear docs, polished demo, beautiful landing)

## 11. Related Specs
- `docs/specs/openspec-move-contracts.md`
- `docs/specs/openspec-mcp-server.md`
- `docs/ARCHITECTURE.md`

## 12. Self-Acceptance Checklist
- [ ] All objectives have runnable commands
- [ ] Hybrid sync works offline + online
- [ ] Privacy gate enforced
- [ ] Marketplace flow complete
- [ ] MCP discoverable
- [ ] Docs & Demo ready for judge
