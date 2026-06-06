# Final submission checklist (maintainer verification)

**Project:** MemWal Agent Memory · **Track:** Walrus · Sui Overflow 2026  
**Verified:** 2026-06-01 · **Branch:** `main`

Judges should use [`JUDGE_GUIDE.md`](../JUDGE_GUIDE.md) and [`judge-walrus-memory-workshop.md`](judge-walrus-memory-workshop.md). This file records the last maintainer smoke run before Devpost freeze.

---

## Judge smoke (no keys required)

| Step | Command | Expected | Last run |
|------|---------|----------|----------|
| 1 | `pnpm install` | deps resolve | ✓ |
| 2 | `pnpm mcp:build && pnpm mcp:e2e` | exit `0`, 5 tests pass | ✓ |
| 3 | `pnpm agent:demo` | exit `0`, `Status: PASS` | ✓ |
| 4 | `pnpm agent:bounty-hunt` | exit `0`, poster + hunter | ✓ |

**One-liner (clone → verify):**

```bash
git clone https://github.com/Olympusxvn/memwal-agent-memory.git
cd memwal-agent-memory
pnpm install && pnpm mcp:build && pnpm mcp:e2e && pnpm agent:demo && pnpm agent:bounty-hunt
```

Offline `Not promoted (offline)` / `Chain offline` in demos is **expected** without `.env` — not a failure.

---

## Optional (live Walrus + chain)

| Step | Setup | Command | Proves |
|------|-------|---------|--------|
| Live blob | `MEMWAL_PRIVATE_KEY`, `MEMWAL_ACCOUNT_ID`, `MEMWAL_SERVER_URL` in `.env` | `MEMWAL_AUTO_PUSH=1 pnpm agent:bounty-hunt` | `✓ Promoted — blob 0x…` |
| Move tests | Sui CLI | `pnpm contracts:test` | 8 Move tests |
| Full CI | — | `pnpm check && pnpm test` | Typecheck + unit tests |

Use **mainnet** relayer (`https://relayer.memory.walrus.xyz`) for live push — workshop kit uses **staging** (`https://relayer-staging.memory.walrus.xyz`) by default.

Optional restore proof (with `MEMWAL_*` in `.env`): `pnpm memwal:restore-smoke`.

---

## Doc entry points (for judges)

| Doc | Purpose |
|-----|---------|
| [`JUDGE_GUIDE.md`](../JUDGE_GUIDE.md) | 5–10 min runbook |
| [`SUBMISSION.md`](../SUBMISSION.md) | Walrus value + why win |
| [`docs/judge-walrus-memory-workshop.md`](judge-walrus-memory-workshop.md) | Official workshop → this repo |
| [`docs/deploy.md`](deploy.md) | Mainnet package + v2 object IDs |
| [`docs/mcp-setup.md`](mcp-setup.md) | Cursor / Claude MCP |

---

## Live assets

| Asset | URL / path |
|-------|------------|
| Dashboard | https://memwalpp-dashboard.vercel.app/ |
| MCP product | https://memwalpp-dashboard.vercel.app/product |
| Demo video | [`docs/memwalpp-demo.mp4`](../docs/memwalpp-demo.mp4) |
| Repository | https://github.com/Olympusxvn/memwal-agent-memory |

---

## Workshop curriculum (attribution)

Built on [Walrus Memory Workshop](https://mystenlabs.notion.site/Walrus-Memory-Workshop-Build-on-the-Memory-Layer-3666d9dcb4e9801dadb0e67ad368235e) · [walrus-memory-workshop-kit](https://github.com/DionisisLougaris/walrus-memory-workshop-kit) · [`SKILL.md`](https://github.com/DionisisLougaris/walrus-memory-workshop-kit/blob/main/SKILL.md). Judges score **this repo**, not the kit.
