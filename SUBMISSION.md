# MemWal Agent Memory — Sui Overflow 2026 · Walrus Track

[Sui Overflow 2026](https://overflow.sui.io)
[Walrus Track](https://mystenlabs.notion.site/walrus-track-problem-statement)
[Sui](https://sui.io)
[Walrus](https://www.walrus.xyz)
[GitHub](https://github.com/Olympusxvn/memwal-agent-memory)


|                                         |                                                                                                                        |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Repository**                          | [https://github.com/Olympusxvn/memwal-agent-memory](https://github.com/Olympusxvn/memwal-agent-memory)                 |
| **Live demo (dashboard)**               | [https://memwalpp-dashboard.vercel.app/](https://memwalpp-dashboard.vercel.app/)                                       |
| **Summary (live)**                      | [https://memwalpp-dashboard.vercel.app/summary](https://memwalpp-dashboard.vercel.app/summary)                         |
| **MCP product intro (Cursor / Claude)** | [https://memwalpp-dashboard.vercel.app/product](https://memwalpp-dashboard.vercel.app/product)                         |
| **Demo video (~2:26)**                  | `[docs/memwalpp-demo.mp4](docs/memwalpp-demo.mp4)` · regenerate: `pnpm demo:publish`                                   |
| **Summary (role & benefits)**           | `[SUMMARY.md](SUMMARY.md)` — one-page overview for judges and readers                                                  |
| **Judge runbook (start here)**          | `[JUDGE_GUIDE.md](JUDGE_GUIDE.md)` — **5–10 minutes**, no API keys required                                            |
| **Workshop → submission map**           | `[docs/judge-walrus-memory-workshop.md](docs/judge-walrus-memory-workshop.md)` — official MemWal workshop vs this repo |
| **Architecture**                        | `[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)` · [SVG diagram](docs/diagrams/memwalpp-merged-architecture.svg)         |
| **Master OpenSpec**                     | `[docs/specs/openspec-memwal-agent-memory.md](docs/specs/openspec-memwal-agent-memory.md)`                             |


---

## 1. Problem

Autonomous agents need memory that is:

- **Fast** during inference (local recall, not round-trips per token)
- **Safe** before sharing (PII redaction, quality gates)
- **Verifiable** when money or reputation is at stake (Walrus proofs, on-chain refs)

Chat logs and opaque databases fail judges and marketplaces: there is no durable blob id, no escrow tied to fulfillment, no portable pack an agent can buy or fork.

---

## 2. Solution (one paragraph)

**MemWal Agent Memory** is a **hybrid verifiable memory layer** and **memory economy**: agents read/write **SQLite-local** memory first, promote only redacted, quality-scored rows to **MemWal → Walrus**, and anchor packs and bounties on **Sui Move** (MemoryPack NFT, marketplace, WAL escrow bounties with `walrus_blob_id` fulfillment). OpenClaw-style hooks wire the story in runnable demos; a **universal MCP Server** (`@memwalpp/mcp`) exposes the same layer to any MCP-compatible agent without importing our packages.

We built on the official **[Walrus Memory Workshop](https://mystenlabs.notion.site/Walrus-Memory-Workshop-Build-on-the-Memory-Layer-3666d9dcb4e9801dadb0e67ad368235e)** ([hands-on kit](https://github.com/DionisisLougaris/walrus-memory-workshop-kit) · `[SKILL.md](https://github.com/DionisisLougaris/walrus-memory-workshop-kit/blob/main/SKILL.md)`, [recording](https://www.youtube.com/watch?v=GncjVUEJw9Y)) — `remember` / `recall` / namespaces on Walrus — and extended it with hybrid gates, judge MCP, and **mainnet** Move. Judges verify **this repository** only; see `[docs/judge-walrus-memory-workshop.md](docs/judge-walrus-memory-workshop.md)`.

---

## 3. Walrus value (why this track)

Walrus is on the **critical path**, not marketing copy:


| Walrus track ask      | MemWal Agent Memory delivery                                               |
| --------------------- | -------------------------------------------------------------------------- |
| Durable blob storage  | `DurableMemoryStore.remember()` → MemWal relayer → **Walrus**              |
| Verifiable recall     | `pullQuery` / MemWal semantic search → hydrate local cache                 |
| Agent integration     | `pnpm agent:demo`, `pnpm agent:bounty-hunt` (exit 0 offline)               |
| Proof surface         | `MemoryRecord.walrusBlobId` + `bounty::submit_fulfillment(walrus_blob_id)` |
| Privacy before upload | `redactForUpstream` in `MemorySyncService` **before** push                 |


```
LocalMemoryStore → redactForUpstream → quality gate → MemWal remember → Walrus blob
                                                              ↓
                                                    walrusBlobId on record + bounty
```

**Code path (30 s skim):** `packages/core/src/memory/memory-sync-service.ts` · `packages/memwal-client/src/durable/durable-memory-store.ts`

---

## 4. Demo flow (judge — ~3 min)

```bash
git clone https://github.com/Olympusxvn/memwal-agent-memory.git && cd memwal-agent-memory
pnpm install
pnpm mcp:build       # build MCP server
pnpm mcp:e2e         # MCP stdio: remember → recall
pnpm agent:demo
pnpm agent:bounty-hunt
```


| Step | What happens                   | Walrus tie-in                                                     |
| ---- | ------------------------------ | ----------------------------------------------------------------- |
| 1    | Seed bounty text → local store | Local-first                                                       |
| 2    | `pushOne` (redact + gate)      | Promotes to MemWal/Walrus when `MEMWAL_*` set; offline skip is OK |
| 3    | `beforeRemember`               | Injects `## Memory context` from hybrid recall                    |
| 4    | `afterThink`                   | Captures agent memory row                                         |
| 5    | `onTaskComplete`               | `syncPending` + outcome stub (ADR-005)                            |
| 6    | **bounty-hunt**                | Poster + Hunter agents; same sync path                            |


**Expected console:** colored `[1/N]` steps → `── RESULT ──` → **exit code 0**.

**MCP (no keys):** the `mcp:e2e` step above gives universal agent access via stdio; client setup in `[docs/mcp-setup.md](docs/mcp-setup.md)` · `[JUDGE_GUIDE.md](JUDGE_GUIDE.md#judge-mcp-quickstart-2-min)`.

**Optional live Walrus (~2 min):** copy `[.env.example](.env.example)`, set `MEMWAL_PRIVATE_KEY`, `MEMWAL_ACCOUNT_ID`, `MEMWAL_SERVER_URL`, then:

```bash
MEMWAL_AUTO_PUSH=1 pnpm agent:bounty-hunt
```

Look for `✓ Promoted — blob …` in poster step 3.

### Honest scope (stubs vs real)


| Component                         | Demo / CLI                           | Production path                                            |
| --------------------------------- | ------------------------------------ | ---------------------------------------------------------- |
| Hybrid sync → Walrus              | **Real** with `MEMWAL_`*             | `MemorySyncService` + `DurableMemoryStore`                 |
| Move marketplace & bounty modules | **Real** on mainnet                  | `[docs/deploy.md](docs/deploy.md)` · `pnpm contracts:test` |
| `agent:bounty-hunt` bounty object | **Stub** metadata (`stub-bounty.ts`) | Not live escrow in offline judge path                      |
| `onTaskComplete` outcome          | **Stub** (ADR-005)                   | Event shape wired; full PTB batch deferred                 |
| Kiosk indexer listings            | **Placeholder** UI                   | Schema in `docs/specs/indexer-schema.sql`                  |


**One line:** Judges verify **memory + Walrus + MCP** without keys; **on-chain IDs and Move tests are real**; CLI bounty escrow is a **labeled stub**, not a hidden mock of Walrus.

### Companion MVP — production proof (Mr. Toxic Special One) - Build for Walrus Sessions 4 - World Cup 2026

Separate repo, same MemWal mainnet stack — **user-facing agent** where memory drives the product (not infrastructure demos).


|              |                                                                                                    |
| ------------ | -------------------------------------------------------------------------------------------------- |
| **Live**     | [https://special-one-agent.vercel.app/chat](https://special-one-agent.vercel.app/chat)             |
| **Repo**     | [https://github.com/Olympusxvn/special-one-agent](https://github.com/Olympusxvn/special-one-agent) |
| **Also for** | Walrus Sessions 4 Memory World Cup                                                                 |
| **Map**      | `[docs/companion-mvp-special-one-agent.md](docs/companion-mvp-special-one-agent.md)`               |


**Why cite it in Overflow:** closes the gap on **Product Experience** and **live Walrus proof** — per-wallet namespaces, prediction ledger (PENDING/CORRECT/WRONG), MemWal 🟢 LIVE on Vercel, [MemWalAccount on mainnet](https://suiscan.xyz/mainnet/object/0x73b07979a6712f54283c02ddf70e2bdfb3ec729627c9ef0e0d8a214015066a99). Platform repo = **how to build**; Special One = **what users get**.

**Judge (~30 s):** wallet → Settings → Gemini key → prediction → **Walrus Memory Ledger** sidebar.

---

## 5. Why this deserves to win Walrus Track

1. **End-to-end Walrus narrative** — from agent hook to `walrusBlobId` to Move bounty fulfillment id.
2. **Production MVP in the wild** — [Mr. Toxic Special One](https://special-one-agent.vercel.app/chat) proves MemWal on Vercel mainnet (companion repo).
3. **Judge-first UX** — strongest demos run **without secrets**; live blob ids are one env block away.
4. **Hybrid architecture done right** — ADR-010 durable-wins on sealed content; not “sync everything.”
5. **Economy + storage** — mainnet Move package (marketplace, escrow bounty, NFT pack) **plus** Walrus durability.
6. **Engineering depth** — OpenSpecs, ADRs, Vitest, `sui move test`, CI — not a slide deck repo.
7. **Clear roadmap forward** — MCP universal access ✓, Move v2 **bootstrapped on mainnet** ✓, live chain PTBs (v1 + v2).

---

## 6. Key features (by phase)


| Phase   | Deliverable                                                                                   | Status                                      |
| ------- | --------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **0–1** | Monorepo, `shared`, `local-memory`, SQLite + redact/score                                     | ✓                                           |
| **2**   | `MemWalClient`, `DurableMemoryStore`, `MemorySyncService`                                     | ✓                                           |
| **3**   | Move v1: `memory_nft`, `marketplace`, `bounty`, `royalty`, `delegate_bridge`, `access_policy` | ✓ mainnet                                   |
| **4**   | `MemWalAgentBridge`, agent demos                                                              | ✓ demos · live bounty PTB is a labeled stub |
| **5**   | Master OpenSpec, `PROJECT.md`, `ARCHITECTURE.md`, `ROADMAP.md`                                | ✓                                           |
| **6**   | MCP Server — memory + chain tools, stdio E2E                                                  | ✓                                           |
| **7**   | Move v2 refactor (upgrade-in-place, tests)                                                    | ✓ mainnet                                   |
| **8**   | Dashboard kiosk PTBs (v1), chain client                                                       | ◐ kiosk PTBs wired; indexer is schema-only  |
| **9**   | Submission polish (this doc, judge guide, demo video)                                         | ✓                                           |


Status mirrors `[ROADMAP.md](ROADMAP.md)`, the granular source of truth. ◐ = partially complete (see "Honest scope" in §4).

---

## 7. On-chain (Sui Mainnet)


|                           |                                                                                                                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Package ID (original)** | `0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050`                                                                                                                                           |
| **Published-at (v3)**     | `0x9de4c63e976b5244fc7a5378134c9a87030ef534491f8a6919698e7379a2b711`                                                                                                                                           |
| **Suiscan**               | [https://suiscan.xyz/mainnet/object/0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050](https://suiscan.xyz/mainnet/object/0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050) |
| **Marketplace (v1)**      | `0x7dea19c34022cc7d28d21bfef75859bd6704f8fbd9bc7ea00c787052f895d548`                                                                                                                                           |
| **Config (v2)**           | `0x52ea5aa40b38de760c3faa08bd83cd047e4d63023091f14774a8a87609f0ecd1`                                                                                                                                           |
| **MarketplaceV2**         | `0xfaddc1f4fe0f82a84d885b47a1202e37dc8f0a87040a7df7ff3e4268566c488f`                                                                                                                                           |
| **Bootstrap tx**          | [https://suiscan.xyz/mainnet/tx/BjV2Q8mCarkmtENT1T3SPncKAFP3qNHQKVJ2DgptUnkW](https://suiscan.xyz/mainnet/tx/BjV2Q8mCarkmtENT1T3SPncKAFP3qNHQKVJ2DgptUnkW)                                                     |
| **Interact**              | `[docs/deploy.md](docs/deploy.md)` · `pnpm contracts:info`                                                                                                                                                     |


Move v2 upgraded **in-place** via UpgradeCap — original package id unchanged for WAL type and explorer. PTB targets use **published-at** id after upgrade v3.

---

## 8. Tech stack

MemWal · Walrus · Sui Move · TypeScript monorepo (Turborepo) · OpenClaw/NemoClaw hooks · **MCP Server** (`@memwalpp/mcp`) · Next.js dashboard.

---

## 9. Verification

**Maintainer smoke (2026-06-01):** `[docs/judge-final-checklist.md](docs/judge-final-checklist.md)` — `mcp:e2e`, `agent:demo`, `agent:bounty-hunt` all exit `0` without keys.

```bash
pnpm check && pnpm build && pnpm test
pnpm mcp:e2e           # MCP stdio E2E
pnpm contracts:test    # Sui CLI — 8 Move tests (v2 + v1)
```

---

## 10. Future work

Indexer + live Kiosk listings · Seal PTB composition · published OpenClaw plugin npm package.

---

## 11. AI disclosure

Built with AI assistants (Cursor, Claude) per **ADR-012**. All material decisions are in `[docs/decisions/](docs/decisions/)`.

---

## 12. Doc index


| Document                                                                                   | Use                                     |
| ------------------------------------------------------------------------------------------ | --------------------------------------- |
| `[SUMMARY.md](SUMMARY.md)`                                                                 | Role, benefits, one-page overview       |
| `[JUDGE_GUIDE.md](JUDGE_GUIDE.md)`                                                         | Step-by-step judge path                 |
| `[docs/companion-mvp-special-one-agent.md](docs/companion-mvp-special-one-agent.md)`       | Production MVP (Special One) ↔ platform |
| `[docs/judge-walrus-memory-workshop.md](docs/judge-walrus-memory-workshop.md)`             | Workshop kit vs submission (judge map)  |
| `[README.md](README.md)`                                                                   | Contributor setup                       |
| `[PROJECT.md](PROJECT.md)`                                                                 | Vision and goals                        |
| `[docs/deploy.md](docs/deploy.md)`                                                         | Move PTB + object IDs                   |
| `[docs/specs/openspec-memwal-agent-memory.md](docs/specs/openspec-memwal-agent-memory.md)` | Master OpenSpec                         |
| `[docs/specs/openspec-move-contracts.md](docs/specs/openspec-move-contracts.md)`           | Move v1 OpenSpec                        |
| `[ROADMAP.md](ROADMAP.md)`                                                                 | Phase status                            |


