# MemWal++ — Demo Video Slides (2–3 min)

**Project:** `memwal-agent-memory` · **Display name:** **MemWal++** (short form)
**Style reference:** [walrus.xyz](https://walrus.xyz/) · design tokens in [`walrus.xyz-DESIGN.md`](../walrus.xyz-DESIGN.md)
**Total runtime target:** ~2:30 (10 slides × ~15–25 s voiceover)
**Live demo (dashboard):** https://memwalpp-dashboard.vercel.app/
**Repository:** https://github.com/Olympusxvn/memwal-agent-memory

---

## Design system (Canva / Slides / Keynote)

Aligned with Walrus brand: premium dark-first, purple + electric cyan accents, generous whitespace, minimal borders.

### Dark mode (default — match walrus.xyz)

| Token | Value | Usage |
|--------|--------|--------|
| Background | `#000000` | Full-bleed slide fill |
| Surface / elevated | `#1C2228`, `#2B2D31` | Cards, code blocks |
| Text primary | `#FAF8F5` | Headlines, body on dark |
| Text muted | `#8E9294` | Bullets, captions |
| Brand purple | `#613DFF` | Primary accent, CTAs |
| Electric cyan | `#98EFE4` | Highlights, hover, Walrus tie-in |
| Light purple | `#CAB1FF` | Secondary accent |
| Soft blue | `#A1C8FF` | Sui / chain callouts |
| Border | `rgba(250, 248, 245, 0.1)` or `#F3F2F2` @ 35% | Card outlines |
| Font display | **Syne** or **Ratch** (if licensed) | Headings 56–96 pt |
| Font body | System / Ratch stack | Body 18–22 pt |
| Mono | JetBrains Mono / SF Mono | Commands |

**Visual motifs:** radial glow (purple top-center, cyan bottom-right), 1px light borders on transparent cards, pill buttons (`border-radius: 26px`), zero-radius section cards per Walrus layout rules.

### Light mode (alternate deck / accessibility)

| Token | Value | Usage |
|--------|--------|--------|
| Background | `#FAF8F5` | Warm off-white fill |
| Surface | `#FFFFFF` @ 72% | Cards |
| Text primary | `#222222` | Headlines |
| Text muted | `#53575A` | Bullets |
| Brand purple | `#613DFF` | CTAs, links |
| Electric cyan | `#2D6A5F` or `#613DFF` | Accents (ensure contrast) |
| Border | `#DADAD6`, `#F3F2F2` | Dividers |
| Separator | `#B0B4B6` | Subtle lines |

**Dashboard:** live demo supports **Dark / Light** toggle — record B-roll in both if time allows.

### Layout rules (from Walrus)

- Max **5 bullets** per slide; **40%+ whitespace**
- Section padding: **64px** desktop, **24px** mobile
- Primary buttons: transparent bg, **2px** off-white border @ 10% opacity (dark) or dark border @ 12% (light)
- One idea per slide

---

## Slide 1 — Title

### On-slide copy

**MemWal++**  
*Hybrid Verifiable Memory for Agents*

`memwal-agent-memory` · Sui Overflow 2026 · Walrus Track

### Bullets (optional footer)

- Local speed · Walrus truth · On-chain economy

### Visual / diagram

- Center: wordmark **MemWal++** with purple → cyan gradient underline
- Subtitle line: `memwal-agent-memory` in muted caps
- Bottom: badges `Walrus` · `Sui` · `MemWal`

### Voiceover (~20 s)

> MemWal++ — MemWal Agent Memory — is hybrid verifiable memory for autonomous agents, built for Sui Overflow and the Walrus track. Local recall when you need speed, Walrus when you need proof, and Sui when money or reputation is on the line.

---

## Slide 2 — The Problem

### Title

**Agents forget everything**

### Bullets

- Chat logs vanish between sessions — no durable truth
- Opaque DBs can't prove what an agent "remembered"
- Marketplaces need **portable, verifiable** memory — not screenshots
- Every token shouldn't wait on a network round-trip

### Visual / diagram

- Split screen: fading chat bubbles vs empty agent head with "?"
- Accent: "no blob id · no escrow · no proof"

### Voiceover (~22 s)

> Autonomous agents need memory that's fast during inference, safe before sharing, and verifiable when stakes are real. Chat history and opaque stores don't give you a Walrus blob id, an on-chain fulfillment ref, or a memory pack someone can buy and audit.

---

## Slide 3 — Solution

### Title

**Hybrid memory architecture**

### Bullets

- **SQLite local-first** — recall in milliseconds
- **MemWal → Walrus** — durable blobs for promoted rows
- **Sui Move** — MemoryPack, marketplace, WAL bounties
- Redact and score **before** anything leaves the machine

### Visual / diagram

- Three-layer stack: `Local` | `MemWal / Walrus` | `Sui Move`
- Purple/cyan gradient connectors

### Voiceover (~20 s)

> MemWal++ is a hybrid memory economy: write locally first, promote only redacted, quality-scored rows to MemWal and Walrus, and anchor packs and bounties on Sui Move — with OpenClaw-style hooks and a universal MCP Server on the roadmap.

---

## Slide 4 — How it works

### Title

**Local → Redact → Gate → Walrus**

### Bullets

- `LocalMemoryStore` — seed & recall
- `redactForUpstream` — strip secrets (ADR-010)
- Quality gate — `MEMWAL_SYNC_QUALITY_MIN`
- `remember()` → **Walrus blob** → `walrusBlobId` on-chain

### Visual / diagram

```
LocalMemoryStore → redactForUpstream → quality gate → MemWal remember → Walrus blob
                                                              ↓
                                                    walrusBlobId + bounty fulfillment
```

### Voiceover (~25 s)

> The critical path is explicit: local store, redaction, quality gate, then MemWal remember to Walrus. Every promoted row can carry a walrus blob id — and bounty fulfillment on Sui references that same id. Judges can run this in three minutes.

---

## Slide 5 — Demo 1 (offline)

### Title

**Demo 1 — Offline mode**

### Bullets

- `pnpm agent:demo` — **no API keys**
- Hooks: `beforeRemember` · `afterThink` · `onTaskComplete`
- Colored `[1/N]` steps → `── RESULT ──` → **exit 0**
- Walrus push optional — offline path still proves architecture

### Visual / diagram

```bash
git clone https://github.com/Olympusxvn/memwal-agent-memory.git && cd memwal-agent-memory
pnpm install
pnpm agent:demo
```

### Voiceover (~20 s)

> Clone memwal-agent-memory, install, run agent demo. You'll see the hook lifecycle end to end — memory context injection, capture after think, sync on task complete — all without wallets or MemWal keys.

---

## Slide 6 — Demo 2 (bounty hunt)

### Title

**Demo 2 — Bounty hunt**

### Bullets

- `pnpm agent:bounty-hunt` — **two agents** (poster + hunter)
- Same hybrid sync path as Demo 1
- Stub ties fulfillment to **`walrus_blob_id`**
- Optional live: `MEMWAL_AUTO_PUSH=1` → see blob in logs

### Visual / diagram

- Poster + Hunter avatars → shared Walrus cloud
- Command: `pnpm agent:bounty-hunt`

### Voiceover (~22 s)

> Bounty hunt runs poster and hunter agents on the same sync service. Offline, it proves multi-agent coordination. With MemWal env vars, watch a real blob id land — the same surface Sui bounties reference on mainnet.

---

## Slide 7 — Live dashboard

### Title

**Live demo**

### Bullets

- **https://memwalpp-dashboard.vercel.app/**
- Walrus-inspired UI — dark + **light mode**
- Wallet connect · judge commands · mainnet package ID
- Memory Kiosk (placeholder until indexer)

### Visual / diagram

- Screen recording: hero → Walrus flow → demo block → theme toggle
- QR code to live URL

### Voiceover (~18 s)

> Open the live dashboard — Walrus-grade UI with light and dark themes. Connect on mainnet, copy judge commands, and skim the on-chain package id without cloning the repo.

---

## Slide 8 — Walrus track highlights

### Title

**Built for Walrus**

### Bullets

- **Durable** — blobs via MemWal relayer
- **Verifiable** — `walrusBlobId` + on-chain fulfillment
- **Programmable** — Move: pack, market, bounty
- **Private-by-design** — redact before upload

### Visual / diagram

- 2×2 grid with purple/cyan outlined tiles

### Voiceover (~18 s)

> Walrus isn't wallpaper here. Storage is durable, recall is verifiable, access is programmable through Move, and privacy is enforced before bits hit the network.

---

## Slide 9 — Why we win

### Title

**Why MemWal++ wins Walrus Track**

### Bullets

- **End-to-end** — agent hook → blob id → Move `submit_fulfillment`
- **Runnable in 3 minutes** — judges need zero keys for core path
- **Mainnet package** — `0x48db…3050` (real IDs)
- **Product surface** — live dashboard + CLI + monorepo SDK
- **Roadmap** — MCP Server + Move v2 lineage (package ID preserved)

### Voiceover (~22 s)

> We connect the full Walrus narrative in code you can run today — plus a live dashboard and a clear roadmap for MCP universal access and Move v2 lineage royalties.

---

## Slide 10 — CTA & Thank you

### On-slide copy

**Try it now**

- **Live demo:** https://memwalpp-dashboard.vercel.app/
- **GitHub:** https://github.com/Olympusxvn/memwal-agent-memory
- **Judge guide:** `JUDGE_GUIDE.md`

MemWal++ · Hybrid Verifiable Memory for Agents

### Voiceover (~18 s)

> Thanks for watching. MemWal++ — local speed, Walrus truth, on-chain economy. Star the repo, open the live demo, run both agent CLIs, and we'll see you on the Walrus track leaderboard.

---

## B-roll checklist

| Clip | Duration | Source |
|------|----------|--------|
| Terminal `pnpm agent:demo` | 25–40 s | Local |
| Terminal `pnpm agent:bounty-hunt` | 25–40 s | Local |
| Dashboard dark mode | 10 s | Live URL |
| Dashboard light mode toggle | 10 s | Live URL |
| Suiscan package (optional) | 10 s | Mainnet |
| Architecture SVG | 10 s | `docs/diagrams/memwalpp-merged-architecture.svg` |

---

## Canva quick setup

1. Custom **1920×1080**; create **two brand kits** (dark + light) from tables above.
2. Dark default: background `#000000`, accents `#613DFF` + `#98EFE4`, font Syne.
3. Light alternate: background `#FAF8F5`, text `#222222`, same purple CTAs.
4. Master slide: gradient title + footer badge strip (`Walrus Track` · `Sui Overflow 2026`).
5. Export MP4 1080p or use as speaker notes with terminal B-roll.
