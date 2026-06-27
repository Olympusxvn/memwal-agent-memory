# Companion MVP — Mr. Toxic Special One

**Sibling product to MemWal Agent Memory (Sui Overflow 2026 · Walrus track)**

| | |
|---|---|
| **Live app** | https://special-one-agent.vercel.app |
| **Press Room** | https://special-one-agent.vercel.app/chat |
| **Repository** | https://github.com/Olympusxvn/special-one-agent |
| **Hackathon** | [Walrus Sessions 4 — Memory World Cup](https://thewalrussessions.wal.app/memory-world-cup) (deadline 24 Jun 2026) |
| **Overflow repo (this monorepo)** | https://github.com/Olympusxvn/memwal-agent-memory |

---

## Why two repos?

| Project | Role | Judge path |
|---------|------|------------|
| **memwal-agent-memory** | Platform: hybrid memory, MCP, Move marketplace, agent demos | Clone + `pnpm mcp:e2e` (no keys) |
| **special-one-agent** | **Production MVP**: user-facing agent where memory *is* the product | Browser only (~30 s) |

Overflow judges score **this repository**. Special One proves the same MemWal patterns work **in production** on Vercel mainnet — not only in CLI demos.

---

## Walrus track alignment (both projects)

| Walrus track ask | memwal-agent-memory | special-one-agent |
|------------------|---------------------|-------------------|
| Long-term memory | `MemorySyncService`, hybrid recall | Per-wallet namespace; ledger survives refresh |
| Persistent data on Walrus | `DurableMemoryStore.remember()` → blob id | `remember()` on every chat turn; ledger UI |
| Agent integration | MCP + OpenClaw hooks + bounty swarm | Streaming roast agent + prediction loop |
| Integrations / tooling | `@memwalpp/mcp`, quality gates, Move economy | Serverless MemWal patterns, multi-tenant namespaces |
| Long-running workflow | `syncPending`, bounty narrative | Prediction PENDING → CORRECT/WRONG over tournament |
| Cross-session proof | Optional `MEMWAL_AUTO_PUSH` | **Default in production** — MemWal 🟢 LIVE |

---

## Judge walkthrough — Special One (~30 seconds)

1. Open [special-one-agent.vercel.app/chat](https://special-one-agent.vercel.app/chat)
2. Connect **Sui wallet** → sign message
3. **Settings** → paste free **Gemini** key ([Google AI Studio](https://aistudio.google.com/apikey))
4. Send: *"I support Brazil, high confidence"* → *"I predict Brazil 3-0 Argentina"*
5. Confirm **Walrus Memory Ledger** (sidebar), **toxicity meter**, **MemWal 🟢 LIVE**, [MemWalAccount on SuiScan](https://suiscan.xyz/mainnet/object/0x73b07979a6712f54283c02ddf70e2bdfb3ec729627c9ef0e0d8a214015066a99)

Full packet: [special-one-agent/SUBMISSION.md](https://github.com/Olympusxvn/special-one-agent/blob/main/SUBMISSION.md)

---

## Technical link (same stack, different layer)

```
┌──────────────────────────────────────────────────────────────┐
│  special-one-agent          User-facing WC 2026 roast bot    │
│  (production Vercel)        MemWal direct — no @memwalpp/*   │
├──────────────────────────────────────────────────────────────┤
│  memwal-agent-memory        Hybrid sync · MCP · Move market  │
│  (Overflow submission)      Extends MemWal + Sui economy     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
              @mysten-incubation/memwal → Walrus (mainnet relayer)
```

Special One uses **official MemWal SDK** only. It validates **portable memory**, **long-term recall**, and **judge-visible UI** that Overflow’s platform layer is meant to enable for any agent app.

---

## MemWal ecosystem feedback (from Special One)

Production serverless usage drove upstream MemWal issues — evidence of real adoption:

| Issue | Summary | Status |
|-------|---------|--------|
| [#246](https://github.com/MystenLabs/MemWal/issues/246) | Multi-tenant namespace cookbook | Closed |
| [#247](https://github.com/MystenLabs/MemWal/issues/247) | Upsert / key-based profile recall | Closed |
| [#248](https://github.com/MystenLabs/MemWal/issues/248) | `healthCheck()` for deploy verify | Closed |
| [#277](https://github.com/MystenLabs/MemWal/issues/277) | Serverless latency guide (Vercel) | Open |

Details: [special-one-agent/FINAL_FEEDBACK.md](https://github.com/Olympusxvn/special-one-agent/blob/main/FINAL_FEEDBACK.md)

---

## Pitch one-liner (Overflow + MVP)

> **Platform:** MemWal Agent Memory — hybrid verifiable memory, MCP, and on-chain memory economy for any agent.  
> **Proof:** Mr. Toxic Special One — live mainnet app where Walrus memory drives prediction roasts for 104 World Cup fixtures.

---

## Related docs (this repo)

| Doc | Use |
|-----|-----|
| [`SUBMISSION.md`](../SUBMISSION.md) | Overflow Walrus track brief |
| [`JUDGE_GUIDE.md`](../JUDGE_GUIDE.md) | Path F — production MVP · Path G — portable |
| [`SUMMARY.md`](../SUMMARY.md) | Platform overview + companion link |
| [`docs/doc-map.html`](doc-map.html) | Judge hub — track map, trust model, benchmarks |
| [`docs/specs/openspec-walrus-track-gaps.md`](specs/openspec-walrus-track-gaps.md) | Post-submit gaps A–H |
| [`docs/walrus-track-post-submit-checklist.md`](walrus-track-post-submit-checklist.md) | Tier S/A/B progress |

## Related docs (Special One repo)

Add to [special-one-agent README](https://github.com/Olympusxvn/special-one-agent) (bidirectional):

- Platform repo: [memwal-agent-memory](https://github.com/Olympusxvn/memwal-agent-memory)
- Companion map: [companion-mvp-special-one-agent.md](https://github.com/Olympusxvn/memwal-agent-memory/blob/main/docs/companion-mvp-special-one-agent.md)
