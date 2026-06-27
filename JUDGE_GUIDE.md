# Judge guide — MemWal Agent Memory (5–10 minutes)

**Walrus Track · Sui Overflow 2026**

> **Start here.** No wallet, no MemWal keys, no Sui CLI required for the core path.


| Resource                                                                                                              | Link                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Judge documentation hub (HTML)**                                                                                    | Live: [memwalpp-dashboard.vercel.app/doc-hub](https://memwalpp-dashboard.vercel.app/doc-hub/) · Repo: `[docs/doc-map.html](docs/doc-map.html)`                        |
| Repository                                                                                                            | [https://github.com/Olympusxvn/memwal-agent-memory](https://github.com/Olympusxvn/memwal-agent-memory)                                                                |
| **Summary (what & why)**                                                                                              | [https://memwalpp-dashboard.vercel.app/summary](https://memwalpp-dashboard.vercel.app/summary) · `[SUMMARY.md](SUMMARY.md)`                                           |
| Live demo (dashboard)                                                                                                 | [https://memwalpp-dashboard.vercel.app/](https://memwalpp-dashboard.vercel.app/)                                                                                      |
| **Workshop → submission map**                                                                                         | `[docs/judge-walrus-memory-workshop.md](docs/judge-walrus-memory-workshop.md)`                                                                                        |
| **Companion MVP (production) -**[Walrus Sessions 4 - World Cup 2026](#companion-mvp--mr-toxic-special-one-production) | `[docs/companion-mvp-special-one-agent.md](docs/companion-mvp-special-one-agent.md)` · [special-one-agent.vercel.app/chat](https://special-one-agent.vercel.app/chat) |
| **Final smoke log**                                                                                                   | `[docs/judge-final-checklist.md](docs/judge-final-checklist.md)`                                                                                                      |
| Submission brief                                                                                                      | `[SUBMISSION.md](SUBMISSION.md)`                                                                                                                                      |
| Architecture                                                                                                          | `[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)`                                                                                                                        |
| Master OpenSpec                                                                                                       | `[docs/specs/openspec-memwal-agent-memory.md](docs/specs/openspec-memwal-agent-memory.md)`                                                                            |
| Diagram                                                                                                               | `[docs/diagrams/memwalpp-merged-architecture.svg](docs/diagrams/memwalpp-merged-architecture.svg)`                                                                    |


---

## What this project is (read first — 60 s)


| Question                   | Answer                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Naming?**                | One project: **MemWal Agent Memory** (repo `memwal-agent-memory`). `MemWal++`, `@memwalpp/`*, and `memwalpp` are legacy short names for the **same** thing. **Walrus Memory (MemWal)** = Mysten's official memory layer we build on.                                                                                                                                                    |
| **Official stack?**        | **Walrus Memory (MemWal)** — `remember` / `recall` / Walrus blobs + Sui account. We **wrap** `[@mysten-incubation/memwal](https://www.npmjs.com/package/@mysten-incubation/memwal)`, not fork it.                                                                                                                                                                                       |
| **Workshop relationship?** | Built on the [Walrus Memory Workshop](https://mystenlabs.notion.site/Walrus-Memory-Workshop-Build-on-the-Memory-Layer-3666d9dcb4e9801dadb0e67ad368235e) curriculum ([kit](https://github.com/DionisisLougaris/walrus-memory-workshop-kit) · `[SKILL.md](https://github.com/DionisisLougaris/walrus-memory-workshop-kit/blob/main/SKILL.md)`). **Judges verify this repo**, not the kit. |
| **What we added?**         | **Hybrid** local SQLite + redact/quality gates → promote to Walrus; **MCP** for any agent; **mainnet Move** marketplace + bounties tied to `walrus_blob_id`.                                                                                                                                                                                                                            |
| **Staging vs mainnet?**    | Workshop uses **staging.memory.walrus.xyz**. This submission’s **on-chain IDs are mainnet** — see [On-chain](#path-d--contracts--ci-5-min-optional) and `[docs/deploy.md](docs/deploy.md)`. Live Walrus push uses **mainnet** relayer `https://relayer.memory.walrus.xyz` in `[.env.example](.env.example)`.                                                                            |


**Extension map (workshop → here):** multi-namespace → namespaces in sync/MCP; verify Walrus → `walrusBlobId` + bounty fulfillment; permissions → mainnet package + deploy doc. Details: `[docs/judge-walrus-memory-workshop.md](docs/judge-walrus-memory-workshop.md)`.

---

## Fastest verify (copy-paste)

```bash
git clone https://github.com/Olympusxvn/memwal-agent-memory.git
cd memwal-agent-memory
pnpm install && pnpm mcp:build && pnpm mcp:e2e && pnpm agent:demo && pnpm agent:bounty-hunt && pnpm agent:shared-memory
```


| Command                  | Exit `0` means                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------- |
| `pnpm mcp:e2e`           | MCP memory tools work (stdio); chain tools OK without keys (`chain_not_configured`) |
| `pnpm mcp:e2e:portable`  | Fresh local store rehydrates from durable + verify PASS ([Path G](#path-g--portable-memory-3-min-optional)) |
| `pnpm agent:demo`        | Hybrid hooks + 5-step narrative                                                     |
| `pnpm agent:bounty-hunt` | Poster + Hunter agents; recall injects context                                      |
| `pnpm agent:shared-memory` | Research + Analyst + Executor share namespace + agent table                        |
| `pnpm agent:resume-session` | Day-2 recall stub (long-running narrative, offline exit 0)                        |


Optional live Walrus blob: [Path B](#path-b--live-walrus-blob-id-2-min-optional). Optional **restore proof**: [Path B+](#path-b-restore-proof-1-min-optional).

### Open the documentation hub


| Where                     | Command or URL                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| **Live (recommended)**    | [https://memwalpp-dashboard.vercel.app/doc-hub/](https://memwalpp-dashboard.vercel.app/doc-hub/) |
| **Windows** (after clone) | `start docs\doc-map.html`                                                                        |
| **macOS** (after clone)   | `open docs/doc-map.html`                                                                         |
| **Repo file**             | `[docs/doc-map.html](docs/doc-map.html)`                                                         |


---

## Scoring lens (Walrus track)


| #   | Question                             | Where to verify                                                  |
| --- | ------------------------------------ | ---------------------------------------------------------------- |
| 1   | Is Walrus on the **critical path**?  | `pushOne` → `walrusBlobId`; bounty `submit_fulfillment(blob_id)` |
| 2   | Can I run it **without setup pain**? | Commands below → exit 0                                          |
| 3   | Is integration **real code**?        | `memory-sync-service.ts`, `MemWalAgentBridge.ts`, `packages/mcp` |
| 4   | Is there **on-chain** story?         | Mainnet package + `[docs/deploy.md](docs/deploy.md)`             |
| 5   | Universal agent access?              | `pnpm mcp:e2e` — stdio MCP memory + chain tools                  |


---

## Judge MCP quickstart (~2 min)

**No wallet, no MemWal keys, no Sui CLI** — verifies hybrid memory over MCP stdio.

### One-liner verify

```bash
git clone https://github.com/Olympusxvn/memwal-agent-memory.git
cd memwal-agent-memory
pnpm install && pnpm mcp:build && pnpm mcp:e2e
```


| Check              | Expected                                                        |
| ------------------ | --------------------------------------------------------------- |
| Exit code          | `0`                                                             |
| Tools listed       | `remember`, `recall`, `search`, `sync`, `getStats`, chain tools |
| Chain without keys | `createBounty` → `chain_not_configured` (**not a failure**)     |


### Cursor (recommended after clone)

1. Open this repo folder in **Cursor** (uses `[.cursor/mcp.json](.cursor/mcp.json)`).
2. **Settings → MCP** → server `memwal-agent-memory` green.
3. In chat: *“Use memwal MCP: remember ‘judge test 2026’, then recall ‘judge test’.”*

Full setup: `[docs/mcp-setup.md](docs/mcp-setup.md)`

### Claude Desktop (optional)

Copy `[docs/examples/claude_desktop_config.json](docs/examples/claude_desktop_config.json)` → Claude config; replace `/ABSOLUTE/PATH/TO/memwal-agent-memory` with your clone path. Restart Claude Desktop.

### What this proves


| Walrus lens       | Evidence                                                             |
| ----------------- | -------------------------------------------------------------------- |
| Real integration  | Same `MemorySyncService` wiring as agent-swarm, exposed as MCP tools |
| Low setup pain    | `pnpm mcp:e2e` only                                                  |
| On-chain optional | v2 mainnet IDs baked in; chain tools gated on delegate key           |


**Mainnet v2 (reference):** Config `0x52ea5aa4…`, MarketplaceV2 `0xfaddc1f4…`, bootstrap tx `BjV2Q8mCarkmtENT1T3SPncKAFP3qNHQKVJ2DgptUnkW` — see `[docs/deploy.md](docs/deploy.md)`.

---

## Path A — Demos only (~3 min) ⭐ recommended

### Commands

```bash
git clone https://github.com/Olympusxvn/memwal-agent-memory.git
cd memwal-agent-memory
pnpm install
pnpm agent:demo
pnpm agent:bounty-hunt
```

### Expected: `pnpm agent:demo`


| Check     | Expected                                                         |
| --------- | ---------------------------------------------------------------- |
| Exit code | `0`                                                              |
| Banner    | `MemWal Agent Memory · agent:demo`                               |
| Steps     | `[1/5]` … `[5/5]` in green                                       |
| Context   | Step 4 shows `## Memory context` injected                        |
| Offline   | Step 3 may show `○ Not promoted (offline)` — **this is correct** |
| Footer    | `── RESULT ──` table + `Status: PASS (exit 0)`                   |


### Expected: `pnpm agent:bounty-hunt`


| Check     | Expected                                              |
| --------- | ----------------------------------------------------- |
| Exit code | `0`                                                   |
| Agents    | Poster (steps 2–3) + Hunter (steps 4–5)               |
| Recall    | Step 4: `Injected N chars from hybrid memory` (N > 0) |
| Footer    | `Agents: poster + hunter` in RESULT block             |


---

## Path B — Live Walrus blob id (~+2 min, optional)

1. Copy `[.env.example](.env.example)` → `.env`
2. Set **delegate** credentials only (ADR-002): `MEMWAL_PRIVATE_KEY`, `MEMWAL_ACCOUNT_ID`, `MEMWAL_SERVER_URL`
3. Run:

```bash
MEMWAL_AUTO_PUSH=1 pnpm agent:bounty-hunt
```


| Check         | Expected                             |
| ------------- | ------------------------------------ |
| Poster step 3 | `✓ Promoted — blob 0x…` (or similar) |
| Durable line  | `Durable: live` in step 1 banner     |


Set `MEMWAL_WAIT_FOR_REMEMBER=1` if recall right after promote returns empty (async upload takes ~5–15s).

---

## Path B+ — Restore proof (~+1 min, optional)

Proves Walrus blobs can rebuild the relayer search index (workshop extension B).

1. Same `.env` as Path B (`MEMWAL_PRIVATE_KEY`, `MEMWAL_ACCOUNT_ID`; relayer defaults to mainnet in `.env.example`).
2. Run:

```bash
pnpm memwal:restore-smoke
```


| Check     | Expected                                                   |
| --------- | ---------------------------------------------------------- |
| Exit code | `0`                                                        |
| Output    | `restored=N skipped=M total=T` for your `MEMWAL_NAMESPACE` |
| Meaning   | Namespace re-indexed from Walrus — not just relayer cache  |


Then `recall` the same namespace to confirm search works. Official tool: `memwal_restore` in `@mysten-incubation/memwal-mcp`.

---

## Path C — Code skim (~2 min)


| File                                                                                                 | Why open it                        |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `[packages/core/src/memory/memory-sync-service.ts](packages/core/src/memory/memory-sync-service.ts)` | Redact → gate → `durable.remember` |
| `[packages/core/src/agent/MemWalAgentBridge.ts](packages/core/src/agent/MemWalAgentBridge.ts)`       | Agent hooks                        |
| `[packages/sui-contracts/sources/bounty.move](packages/sui-contracts/sources/bounty.move)`           | WAL escrow + `walrus_blob_id`      |
| `[apps/agent-swarm/src/swarm/demo.ts](apps/agent-swarm/src/swarm/demo.ts)`                           | Judge demo script                  |


---

## Path D — Contracts & CI (~+5 min, optional)

```bash
pnpm contracts:info     # package + marketplace IDs
pnpm contracts:test     # requires Sui CLI (8 tests)
pnpm check && pnpm test
pnpm mcp:e2e            # MCP stdio integration
```

**Operators only** (mainnet v2 bootstrap, already live): `pnpm contracts:upgrade-v2` → `pnpm contracts:bootstrap-v2` — see `[docs/deploy.md](docs/deploy.md)`.


| Item                       | Value                                                                                                                                                                                                          |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package ID (original)      | `0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050`                                                                                                                                           |
| Published-at (PTB targets) | `0x9de4c63e976b5244fc7a5378134c9a87030ef534491f8a6919698e7379a2b711`                                                                                                                                           |
| Marketplace                | `0x7dea19c34022cc7d28d21bfef75859bd6704f8fbd9bc7ea00c787052f895d548`                                                                                                                                           |
| Explorer                   | [https://suiscan.xyz/mainnet/object/0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050](https://suiscan.xyz/mainnet/object/0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050) |


---

## Path G — Portable memory (~3 min, optional)

Proves memory is **portable**: promote to durable (mock or live Walrus), then rehydrate into a **fresh local store** and verify.

```bash
pnpm mcp:e2e:portable
```

**What PASS means:** `remember` → `sync` → new empty local SQLite → `pullQuery forceDurable` finds the row → `verify` valid.

**MCP tool:** `saveArtifact` stores JSON/markdown reports with `artifact: true` metadata (see [`docs/mcp-setup.md`](docs/mcp-setup.md)).

**Live Walrus restore smoke:** `pnpm memwal:restore-smoke` (requires `MEMWAL_*` keys — optional).

**Long-running stub:** `pnpm agent:resume-session` — seeds session-1 memory, session-2 `pullQuery` recall (companion: [Special One](https://special-one-agent.vercel.app/chat)).

---

## Path E — MCP Server

See **[Judge MCP quickstart](#judge-mcp-quickstart-2-min)** above.

---

## Path F — Production MVP (~30 s, browser) - Walrus Sessions 4 - World Cup 2026

**Mr. Toxic Special One** — sibling repo; same MemWal mainnet, user-facing World Cup roast agent.


| Step | Action                                                                                                                                                                         |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | Open [special-one-agent.vercel.app/chat](https://special-one-agent.vercel.app/chat)                                                                                            |
| 2    | Connect Sui wallet → sign                                                                                                                                                      |
| 3    | Settings → paste free [Gemini key](https://aistudio.google.com/apikey)                                                                                                         |
| 4    | Send a team + score prediction                                                                                                                                                 |
| 5    | Confirm **Walrus Memory Ledger** + **MemWal 🟢 LIVE** + [MemWalAccount](https://suiscan.xyz/mainnet/object/0x73b07979a6712f54283c02ddf70e2bdfb3ec729627c9ef0e0d8a214015066a99) |



| Resource          | Link                                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| Repo              | [https://github.com/Olympusxvn/special-one-agent](https://github.com/Olympusxvn/special-one-agent)         |
| Platform map      | `[docs/companion-mvp-special-one-agent.md](docs/companion-mvp-special-one-agent.md)`                       |
| Submission packet | [special-one-agent/SUBMISSION.md](https://github.com/Olympusxvn/special-one-agent/blob/main/SUBMISSION.md) |


**Why Path F matters:** Path A–D prove **platform + MCP + Move**. Path F proves **memory as product** on production Vercel — long-term recall, judge-visible ledger, cross-session wallet namespaces.

---

## Troubleshooting


| Issue                                 | Fix                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------- |
| `pnpm: command not found`             | Install pnpm 10 + Node 20+                                                |
| `Cannot find module …`                | Run `pnpm install && pnpm mcp:build` first                                |
| No colored output                     | Windows Terminal / modern terminal; demos still pass                      |
| `pushOne skipped (offline)`           | Normal without `.env` — not a failure                                     |
| SQLite vs in-memory                   | Both valid; banner shows `Store: sqlite` or `in-memory`                   |
| `sui: command not found`              | Install Sui CLI — only needed for `pnpm contracts:test` (optional Path D) |
| Live recall empty right after promote | Walrus upload is async (~5–15s); set `MEMWAL_WAIT_FOR_REMEMBER=1`         |
| `memwal:restore-smoke` returns `0`    | Wait for Walrus finality; use the same `MEMWAL_NAMESPACE` as on promote   |


---

## Why we built this (30 s)

Agents need **local speed** and **Walrus truth**. MemWal Agent Memory connects them with quality gates, PII redaction, runnable demos, and mainnet Move marketplace/bounty — see `[SUBMISSION.md](SUBMISSION.md)` §5.

**Demo north star:** bounty → acquire → improve → fork → payout — every claim traceable to a Walrus blob id or on-chain event.