# Judge guide — MemWal++ (5–10 minutes)

**Walrus Track · Sui Overflow 2026**

| | |
|---|---|
| **Repo** | https://github.com/Olympusxvn/memwalpp |
| **Submission brief** | [`SUBMISSION.md`](SUBMISSION.md) |
| **Architecture** | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [diagram](docs/diagrams/memwalpp-merged-architecture.svg) |

---

## What to look for (Walrus track)

1. **Walrus is on the critical path** — agent memories promote to MemWal → **Walrus blob ids** (`walrusBlobId`), not a side note.
2. **Runnable without secrets** — demos exit 0 with no API keys.
3. **Hybrid design** — local speed + durable truth (ADR-010).
4. **Sui economy** — Move package published on mainnet (marketplace, bounty, NFT).

---

## Fast path (~3 min, no keys)

```bash
git clone https://github.com/Olympusxvn/memwalpp.git
cd memwalpp
pnpm install
pnpm agent:demo
pnpm agent:bounty-hunt
```

**Expected:** colored `[1/N]` steps, `── RESULT ──` block, **exit code 0**.

| Command | Proves |
|---------|--------|
| `agent:demo` | `beforeRemember` injects memory → `afterThink` captures → `pushOne` redacts (offline: skip is OK) |
| `agent:bounty-hunt` | Poster + Hunter swarm, hybrid recall, sync hooks |

---

## Optional: live Walrus blob id (~2 min)

```bash
cp .env.example .env
# Delegate key only (ADR-002) — never use owner wallet keys
# MEMWAL_PRIVATE_KEY=...
# MEMWAL_ACCOUNT_ID=...
# MEMWAL_SERVER_URL=http://localhost:3001
MEMWAL_AUTO_PUSH=1 pnpm agent:bounty-hunt
```

Look for: `✓ Promoted — blob …` in step 3 (poster push).

---

## Code pointers (2 min skim)

| Walrus integration | File |
|--------------------|------|
| MemWal → durable store | `packages/memwal-client/src/durable/durable-memory-store.ts` |
| Redact → push → blob ref | `packages/core/src/memory/memory-sync-service.ts` |
| Agent hooks | `packages/core/src/agent/MemWalAgentBridge.ts` |
| Judge demos | `apps/agent-swarm/src/swarm/demo.ts` |

---

## On-chain (mainnet)

**Package ID:** `0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050`  
**Explorer:** https://suiscan.xyz/mainnet/object/0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050

```bash
pnpm contracts:test   # requires Sui CLI
```

---

## Full CI-style check (~5 min)

```bash
pnpm check
pnpm build
pnpm test
```

---

## Questions?

See [`SUBMISSION.md`](SUBMISSION.md) § *Why this deserves to win Walrus Track* and [`docs/decisions/`](docs/decisions/) for ADRs.
