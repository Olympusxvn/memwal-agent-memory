# MemWal++ — Demo Video Slides (2–3 min)

**Style reference:** [walrus.xyz](https://walrus.xyz/) — premium dark, cyan→violet gradient, minimal copy.  
**Total runtime target:** ~2:30 (10 slides × ~15–25 s voiceover)  
**Production URL:** https://memwalpp-dashboard.vercel.app/  
**Repository:** https://github.com/Olympusxvn/memwalpp

---

## Design system (copy into Canva / Slides / Keynote)

| Token | Value | Usage |
|--------|--------|--------|
| Background | `#05050a` or `#0a0a0a` | Full-bleed slide fill |
| Surface | `#12121f` @ 60% opacity | Cards, code blocks |
| Text primary | `#f4f2ff` | Headlines |
| Text secondary | `#9b97b8` | Bullets, captions |
| Gradient accent | `#00f5ff` → `#a78bfa` (135°) | Titles, icons, dividers, CTA buttons |
| Walrus green (optional) | `#4ade80` | Track badge only |
| Sui blue (optional) | `#4da2ff` | Sui / chain callouts |
| Font | **Inter** or **Satoshi** | Headings 48–72 pt, body 22–28 pt |
| Layout | Max 5 bullets; 40%+ whitespace | One idea per slide |

**Visual motifs:** soft radial glow (cyan top-center, violet bottom-right), thin 1px gradient borders on cards, monospace for commands (`JetBrains Mono` / `SF Mono`).

---

## Slide 1 — Title

### On-slide copy

**MemWal++**  
*Hybrid Verifiable Memory for Agents*

Sui Overflow 2026 · Walrus Track

### Bullets (optional footer)

- Local speed · Walrus truth · On-chain economy

### Visual / diagram

- Center: wordmark **MemWal++** with gradient underline.
- Subtle dual icon: stylized **walrus** silhouette + **neural network / brain** node graph (line art, 20% opacity behind title).
- Bottom corner: small badges `Walrus` · `Sui` · `MemWal`.

### Voiceover (~20 s)

> MemWal++ is hybrid verifiable memory for autonomous agents — built for Sui Overflow and the Walrus track. Local recall when you need speed, Walrus when you need proof, and Sui when money or reputation is on the line.

---

## Slide 2 — The Problem

### Title

**Agents forget everything**

### Bullets

- Chat logs vanish between sessions — no durable truth
- Opaque DBs can’t prove what an agent “remembered”
- Marketplaces need **portable, verifiable** memory — not screenshots
- Every token shouldn’t wait on a network round-trip

### Visual / diagram

- Split screen: left = fading chat bubbles dissolving; right = empty agent head icon with “?”  
- Red accent on “no blob id · no escrow · no proof”.

### Voiceover (~22 s)

> Autonomous agents need memory that’s fast during inference, safe before sharing, and verifiable when stakes are real. Chat history and opaque stores don’t give you a Walrus blob id, an on-chain fulfillment ref, or a memory pack someone can buy and audit.

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

- Three-layer stack (bottom → top): `Local` | `MemWal / Walrus` | `Sui Move`  
- Use gradient connectors between layers.

### Voiceover (~20 s)

> MemWal++ is a hybrid memory economy: write locally first, promote only redacted, quality-scored rows to MemWal and Walrus, and anchor packs and bounties on Sui Move — with OpenClaw-style hooks wiring the full story in runnable code.

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

**Horizontal flow (gradient arrows):**

```
LocalMemoryStore → redactForUpstream → quality gate → MemWal remember → Walrus blob
                                                              ↓
                                                    walrusBlobId + bounty fulfillment
```

- Film terminal snippet: `packages/core/src/memory/memory-sync-service.ts` (optional B-roll).

### Voiceover (~25 s)

> The critical path is explicit: local store, redaction, quality gate, then MemWal remember to Walrus. Every promoted row can carry a walrus blob id — and bounty fulfillment on Sui references that same id. This isn’t marketing copy; it’s the code path judges can run in three minutes.

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

- Terminal mockup (dark card) with commands:

```bash
git clone https://github.com/Olympusxvn/memwalpp.git && cd memwalpp
pnpm install
pnpm agent:demo
```

- Highlight green `PASS` / exit code 0.

### Voiceover (~20 s)

> Clone the repo, install, run agent demo. You’ll see the hook lifecycle end to end — memory context injection, capture after think, sync on task complete — all without wallets or MemWal keys. Exit code zero is the bar; live Walrus is optional icing.

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

- Two agent avatars labeled **Poster** and **Hunter**, arrow through shared Walrus cloud.
- Command line: `pnpm agent:bounty-hunt`
- Optional caption: `✓ Promoted — blob …` when live keys set.

### Voiceover (~22 s)

> Bounty hunt runs poster and hunter agents on the same sync service. Offline, it proves multi-agent coordination and the fulfillment story. Turn on MemWal env vars and you can watch a real blob id land — the same surface Sui bounties reference on mainnet.

---

## Slide 7 — Walrus track highlights

### Title

**Built for Walrus**

### Bullets

- **Durable** — blobs via MemWal relayer, not ephemeral logs
- **Verifiable** — `walrusBlobId` + on-chain fulfillment
- **Programmable** — Move modules: pack, market, bounty
- **Private-by-design** — redact before upload

### Visual / diagram

- Four gradient-outlined tiles in a 2×2 grid (icons: shield, link, code, lock).
- Subtle Walrus wordmark watermark at 8% opacity.

### Voiceover (~18 s)

> Walrus isn’t wallpaper here. Storage is durable, recall is verifiable, access is programmable through Move, and privacy is enforced before bits hit the network — exactly what the Walrus track asks for.

---

## Slide 8 — Why we win

### Title

**Why MemWal++ wins Walrus Track**

### Bullets

- **End-to-end** — agent hook → blob id → Move `submit_fulfillment`
- **Runnable in 3 minutes** — judges need zero keys for core path
- **Mainnet package** published — real IDs, not vaporware
- **Product surface** — dashboard + CLI + monorepo SDK
- **Honest scope** — indexer/UI PTBs on roadmap, core path ships today

### Visual / diagram

- Checklist with gradient checkmarks; small Suiscan / package id footer (optional blur last 8 chars).

### Voiceover (~22 s)

> We connect the full Walrus narrative in code you can run today: hooks, sync service, durable store, and mainnet Move. Judges get a five-minute runbook, exit-zero demos, and a live dashboard — while we’re clear about what’s next versus what already works.

---

## Slide 9 — Conclusion & CTA

### Title

**Try it now**

### Bullets

- **Live demo:** https://memwalpp-dashboard.vercel.app/
- **GitHub:** https://github.com/Olympusxvn/memwalpp
- **Judge guide:** `JUDGE_GUIDE.md` in repo
- Sui Overflow 2026 · Walrus Track

### Visual / diagram

- Large QR codes (optional): repo URL + dashboard URL side by side.
- Screenshot of dashboard hero (wallet connect + demo commands section).

### Voiceover (~18 s)

> Open the dashboard, connect on mainnet, read the judge guide, or clone and run both demos. Everything links from one repo — built for Walrus, shipped for Sui Overflow.

---

## Slide 10 — Thank you

### Title

**Thank you**

### On-slide copy

MemWal++ · Hybrid Verifiable Memory for Agents

### Bullets

- github.com/Olympusxvn/memwalpp
- memwalpp-dashboard.vercel.app
- Questions welcome

### Visual / diagram

- Center: QR code → `https://github.com/Olympusxvn/memwalpp`
- Gradient MemWal++ logotype; minimal confetti particles (cyan/violet, very subtle).

### Voiceover (~15 s)

> Thanks for watching. MemWal++ — local speed, Walrus truth, on-chain economy. Star the repo, run the demos, and we’ll see you on the Walrus track leaderboard.

---

## B-roll checklist (while recording)

| Clip | Duration | Source |
|------|----------|--------|
| Terminal `pnpm agent:demo` | 25–40 s | Local screen capture |
| Terminal `pnpm agent:bounty-hunt` | 25–40 s | Local screen capture |
| Dashboard scroll (hero → demo block) | 15 s | https://memwalpp-dashboard.vercel.app/ |
| Suiscan package (optional) | 10 s | Mainnet package page |
| Architecture SVG | 10 s | `docs/diagrams/memwalpp-merged-architecture.svg` |

---

## Timing sheet (edit guide)

| Slide | Target | Cumulative |
|-------|--------|------------|
| 1 Title | 0:20 | 0:20 |
| 2 Problem | 0:22 | 0:42 |
| 3 Solution | 0:20 | 1:02 |
| 4 Flow | 0:25 | 1:27 |
| 5 Demo 1 | 0:20 | 1:47 |
| 6 Demo 2 | 0:22 | 2:09 |
| 7 Walrus | 0:18 | 2:27 |
| 8 Why win | 0:22 | 2:49 |
| 9 CTA | 0:18 | 3:07 |
| 10 Thanks | 0:15 | **~3:22** (trim 5–7 on slides 7–8 for strict 3:00) |

---

## Canva quick setup

1. Custom size **1920×1080**, background `#05050a`.
2. Create brand kit: gradient `#00f5ff` → `#a78bfa`, fonts Inter/Satoshi.
3. Master slide: title gradient text + footer badge strip.
4. Paste each slide section above into one page per slide.
5. Export **MP4 1080p** or use as speaker notes while recording terminal B-roll.
