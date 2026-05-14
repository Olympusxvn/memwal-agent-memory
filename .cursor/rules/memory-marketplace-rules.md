# Memory Marketplace + Bounty Agents - Cursor Rules
**Project**: Memory Marketplace on Walrus + Sui Overflow 2026
**Track**: Walrus Specialized + Agentic Web
**Mục tiêu**: Xây dựng Decentralized Verifiable Memory Marketplace với Autonomous Bounty Hunter Agents

## 1. Project Vision & Core Values
- Xây dựng **Memory Economy** nơi AI agents có thể mua, bán, fork, improve và earn từ memories một cách verifiable.
- Ưu tiên: **Verifiable + Privacy-first + Autonomous**.
- Sử dụng tối đa: MemWal + Walrus (durable storage), NemoClaw/OpenClaw (agent sandbox), agentmemory + memoirs (local layer).

## 2. Architecture Principles (Tuân thủ nghiêm ngặt)
- **Hybrid Memory Architecture**: Local-first (speed + privacy) → Walrus (durable + verifiable + shareable)
- Separation of Concerns rõ ràng:
  - Local Layer: Quality scoring, PII redaction, fast recall
  - Durable Layer: MemWal + Walrus
  - Onchain Layer: Sui Move contracts (bounty, royalty, memory objects)
  - Orchestration Layer: NemoClaw/OpenClaw
- Luôn ưu tiên **cryptographic truth** và **auditability**.

## 3. Tech Stack
- **Language**: TypeScript (strict), Move (Sui)
- **Monorepo**: Turborepo + pnpm
- **Agent Framework**: NemoClaw / OpenClaw
- **Memory**:
  - Local: agentmemory + memoirs
  - Durable: MemWal + Walrus (client-side SEAL encryption)
- **Blockchain**: Sui Move + WAL token
- **Frontend**: Next.js hoặc Tauri

## 4. Coding Standards (Karpathy + GSD + Superpowers style)
- Code phải **clean, surgical, minimal**.
- Functions nhỏ, single responsibility.
- TypeScript strict mode, exhaustive checking.
- Comment rõ ràng cho agent hiểu context (đặc biệt hooks và Move contracts).
- Error handling phải explicit và graceful.
- Luôn nghĩ đến **demo cho judge** (clear logs, progress, verifiable proofs).

## 5. Key Components & Conventions
- `packages/core/` → business logic
- `packages/memwal-client/` → tất cả tương tác với MemWal/Walrus
- `packages/local-memory/` → adapters cho agentmemory + memoirs + quality scorer
- `packages/sui-contracts/` → Move sources + tests
- Memory objects luôn có: version, lineage, performance metrics, creator, proof

## 6. Development Workflow
1. Viết spec rõ ràng trước (OpenSpec)
2. Implement local layer trước → test quality scoring
3. Integrate MemWal
4. Build Move contracts (bounty + royalty + memory nft)
5. Xây autonomous agent swarm (Bounty Hunter, Contributor, Evaluator)
6. Cuối cùng mới làm Dashboard

## 7. Security & Privacy Rules
- Client-side encryption mặc định (SEAL)
- PII redaction trước khi push lên Walrus
- Local memories không bao giờ leak trừ khi user explicit cho phép
- Phải có access control rõ ràng cho memory spaces

## 8. Hackathon Optimization
- Luôn giữ demo flow ngắn gọn, visual, impressive (agent tự động hunt bounty → mua memory → improve → fork → payout)
- Code phải dễ hiểu cho judge (good naming, comments, README)
- Chuẩn bị metrics: số memory traded, royalty distributed, success rate của agents

## 9. When in doubt
- Ưu tiên **verifiability > convenience**
- Ưu tiên **agent autonomy**
- Clean code > clever code
- Nếu không chắc → hỏi lại architecture trước khi implement

**Bạn là Cursor Agent chuyên xây dựng AI Agent Memory Economy trên Sui + Walrus.**
Hãy code với chất lượng production, tư duy hệ thống và chuẩn bị cho hackathon lớn.

Bắt đầu khi được yêu cầu.
