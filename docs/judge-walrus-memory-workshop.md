# Walrus Memory workshop → this submission (judge map)

**Audience:** Sui Overflow 2026 · Walrus track judges  
**Time to read:** ~3 minutes  
**Run commands:** [`JUDGE_GUIDE.md`](../JUDGE_GUIDE.md) (5–10 min, no keys required)

---

## 30-second mental model

**Walrus Memory (MemWal)** is Mysten’s official memory layer for AI agents:

| Concept | Meaning |
|---------|---------|
| **One account** | `MemWalAccount` on Sui; your wallet owns it; up to **20 delegate keys** (agent signing, revocable on dashboard). |
| **Two verbs** | `remember(text)` stores as-is; `recall(query)` semantic search. |
| **Plus `analyze`** | LLM extracts atomic facts, then stores each via `remember`. |
| **Namespaces** | Isolation = `(owner, namespace)`. Same delegate, different namespace → **no cross-leak**. |
| **Storage** | SEAL-encrypted blobs on **Walrus**; relayer indexes for speed; **Sui** enforces ownership/delegates. |

**This repo does not replace MemWal.** It **wraps** `@mysten-incubation/memwal` and adds hybrid local memory, quality gates, MCP, and a **Sui Move memory economy** (marketplace, bounties, royalties).

---

## Official workshop (what Mysten taught)

| Resource | Link |
|----------|------|
| Workshop Notion (full guide) | https://mystenlabs.notion.site/Walrus-Memory-Workshop-Build-on-the-Memory-Layer-3666d9dcb4e9801dadb0e67ad368235e |
| Hands-on kit repo | https://github.com/DionisisLougaris/walrus-memory-workshop-kit |
| Kit SDK reference (`SKILL.md`) | https://github.com/DionisisLougaris/walrus-memory-workshop-kit/blob/main/SKILL.md |
| MemWal repo (canonical) | https://github.com/MystenLabs/MemWal |
| Workshop closing survey (Mysten) | https://docs.google.com/forms/d/e/1FAIpQLSdNxVFuVipZVjzZH2YDqvf8794i8mFgbXQ2mw9XvgwXNElj6Q/viewform |
| Walrus Memory 101 slides | https://drive.google.com/file/d/1x4QePXh_8q7Gc9CBDAvtWq5axSMJFK2H/view |
| Docs | https://docs.wal.app (Walrus Memory) |
| Dashboard **testnet** (workshop default) | https://staging.memory.walrus.xyz |
| Dashboard **mainnet** (live MemWal push) | https://memory.walrus.xyz |
| npm SDK | https://www.npmjs.com/package/@mysten-incubation/memwal |
| Workshop recording | https://www.youtube.com/watch?v=GncjVUEJw9Y |

Workshop app: minimal **reading tracker** on `localhost:3000` — `analyze()` on a paragraph, then `recall()`.

### SDK surface (from kit `SKILL.md` → this repo)

Workshop teaches the same API we wrap in [`packages/memwal-client`](../packages/memwal-client/README.md):

| MemWal SDK | Workshop / `SKILL.md` | This submission |
|------------|----------------------|-----------------|
| `remember` | Store text as-is | `DurableMemoryStore.remember` after redact + quality gate |
| `recall` | Semantic search | `recall` / MCP `recall` / hybrid `pullQuery` |
| `analyze` | LLM facts → multiple remembers | Optional upstream; demos use structured local seed + promote |
| `restore` | Prove blobs on Walrus vs relayer cache | Proof via `walrusBlobId` + bounty `walrus_blob_id` (see extension B above) |
| Relayers | `relayer-staging.memory.walrus.xyz` (workshop) · `relayer.memory.walrus.xyz` (prod) | [`.env.example`](../.env.example) defaults to **mainnet** relayer |

Canonical SDK docs: [docs.wal.app](https://docs.wal.app) · LLM index: [llms.txt](https://docs.wal.app/llms.txt).

---

## Workshop kit vs MemWal Agent Memory (this repo)

| | Workshop kit | **This submission** |
|---|--------------|-------------------|
| **Goal** | Learn SDK + log `FEEDBACK.md` | End-to-end **hybrid memory + economy** for judges |
| **Stack** | Single Next.js app | Turborepo: `local-memory`, `memwal-client`, `core`, `sui-contracts`, `mcp`, `agent-swarm`, dashboard |
| **Credentials** | **Staging** relayer + dashboard | **Mainnet** Move package + optional `MEMWAL_*` for live blob push |
| **Memory model** | Direct `remember` / `recall` / `analyze` in UI | **Local-first** → redact → quality gate → promote to Walrus |
| **Agents** | AI extends kit in 90 min | Runnable `pnpm agent:demo`, `pnpm agent:bounty-hunt`, **MCP** `pnpm mcp:e2e` |
| **On-chain** | Extension C: read-only `/permissions` | **Published Move**: marketplace, bounty + `walrus_blob_id`, NFT pack, v2 Config/MarketplaceV2 |

**One line for Devpost:** *Built on official Walrus Memory primitives from the Overflow workshop; extended with verifiable hybrid memory, judge-ready MCP, and mainnet Sui Move marketplace.*

---

## Workshop extensions → where judges see it here

Workshop participants pick **one** of three extensions (~10–20 min each). This project **implements the ideas** at production depth:

| Workshop extension | Teaches | In this repo |
|--------------------|---------|--------------|
| **A. Multi-namespace** | Namespace string = only isolation primitive | `namespace` on remember/recall in [`packages/memwal-client`](../packages/memwal-client/README.md); MCP + sync pass namespace; not a UI dropdown like the kit |
| **B. Verify on Walrus** | `restore()` proves blobs exist beyond relayer cache | **Walrus proof path:** `MemoryRecord.walrusBlobId` after promote; `bounty::submit_fulfillment(walrus_blob_id)` on-chain; optional live: `MEMWAL_AUTO_PUSH=1` → `✓ Promoted — blob 0x…` in [`JUDGE_GUIDE.md`](../JUDGE_GUIDE.md) Path B |
| **C. Permissions dashboard** | Control plane on Sui (delegates), separate from relayer | **Stronger story:** mainnet package + delegate bridge + explorer IDs in [`docs/deploy.md`](deploy.md); wallet owners at [memory.walrus.xyz](https://memory.walrus.xyz) |

**Data plane vs control plane** (extension C theory):

```
analyze / remember / recall  →  relayer  →  Walrus blobs   (data plane — fast)
account / delegate keys      →  Sui Move  →  transparent   (control plane — this repo’s marketplace + bounties)
```

---

## Staging vs mainnet (avoid confusion)

| | Workshop / kit | Judge verify **this repo** |
|---|----------------|----------------------------|
| Dashboard | https://staging.memory.walrus.xyz | https://memory.walrus.xyz (when using live MemWal) |
| Relayer | `https://relayer-staging.memory.walrus.xyz` | `https://relayer.memory.walrus.xyz` (see [`.env.example`](../.env.example)) |
| Sui network | Testnet in kit extension C | **Mainnet** package — [`docs/deploy.md`](deploy.md) |
| Required to score | Clone **this** repo | **Not** required to clone workshop kit |

---

## Judge verification paths (pick one)

| Path | Time | Command / link | Proves |
|------|------|----------------|--------|
| **MCP** ⭐ | ~2 min | `pnpm install && pnpm mcp:build && pnpm mcp:e2e` | Real MemWal wiring via MCP; no wallet |
| **Demos** ⭐ | ~3 min | `pnpm agent:demo && pnpm agent:bounty-hunt` | Hybrid hooks + bounty narrative; exit 0 offline OK |
| **Live Walrus** | +2 min | `.env` + `MEMWAL_AUTO_PUSH=1 pnpm agent:bounty-hunt` | Real `walrusBlobId` on promote |
| **Restore proof** | +1 min | `pnpm memwal:restore-smoke` (with `MEMWAL_*`) | Re-index namespace from Walrus blobs |
| **Dashboard** | ~1 min | https://memwalpp-dashboard.vercel.app/ | UI + on-chain story |
| **Workshop kit** (optional) | ~5 min | Clone [walrus-memory-workshop-kit](https://github.com/DionisisLougaris/walrus-memory-workshop-kit) | Official SDK only — **not** required for this submission |

Full steps: [`JUDGE_GUIDE.md`](../JUDGE_GUIDE.md).

---

## Dual MCP (official vs this repo)

Walrus Memory ships **`@mysten-incubation/memwal-mcp`** — six tools (`memwal_remember`, `memwal_recall`, `memwal_analyze`, `memwal_restore`, `memwal_login`, `memwal_logout`) with inline browser wallet login. Use it for **pure Walrus Memory** in Cursor/Claude with no custom code.

**This repo** ships **`@memwalpp/mcp`** — hybrid local SQLite + optional Walrus promote, plus **Sui chain tools** (bounty, kiosk). Judges without keys run **`pnpm mcp:e2e`** (offline-safe).

| | Official `memwal-mcp` | `@memwalpp/mcp` (this repo) |
|---|----------------------|----------------------------|
| **Judge without keys** | Needs `memwal_login` once | `pnpm mcp:e2e` exit 0 |
| **Walrus path** | Direct relayer | Local-first → redact → promote |
| **Economy** | — | Move marketplace / bounty tools |
| **Install** | `npx -y @mysten-incubation/memwal-mcp --prod` | Clone + `pnpm mcp:build` |

Product guide: [`docs/product/README.md`](product/README.md). Post-hackathon backlog: [`walrus-memory-alignment.md`](walrus-memory-alignment.md).

---

## Code map (Walrus on critical path)

| Step | File |
|------|------|
| Redact + quality gate before upload | [`packages/core/src/memory/memory-sync-service.ts`](../packages/core/src/memory/memory-sync-service.ts) |
| MemWal → Walrus | [`packages/memwal-client/src/durable/durable-memory-store.ts`](../packages/memwal-client/src/durable/durable-memory-store.ts) |
| Agent hooks | [`packages/core/src/agent/MemWalAgentBridge.ts`](../packages/core/src/agent/MemWalAgentBridge.ts) |
| Judge demo script | [`apps/agent-swarm/src/swarm/demo.ts`](../apps/agent-swarm/src/swarm/demo.ts) |
| Bounty + blob id | [`packages/sui-contracts/sources/bounty.move`](../packages/sui-contracts/sources/bounty.move) |
| MCP tools | [`packages/mcp`](../packages/mcp/README.md) |

---

## Acknowledgement

We attended the **Walrus Memory Workshop** curriculum and built on the official MemWal SDK. This repository is our **Overflow submission** — workshop kit + extensions + mainnet economy + judge MCP.
