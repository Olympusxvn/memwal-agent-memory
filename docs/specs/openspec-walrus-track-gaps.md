# OpenSpec: Walrus Track gap closure (post-submit)

**Project:** memwal-agent-memory  
**Version:** 1.0  
**Date:** June 13, 2026  
**Status:** Active — post–Sui Overflow 2026 submission; judges may still review ongoing work  
**Track reference:** [Walrus Track Problem Statement](https://mystenlabs.notion.site/walrus-track-problem-statement)  
**Related:** [`PROJECT.md`](../../PROJECT.md) · [`ROADMAP.md`](../../ROADMAP.md) · [`docs/walrus-track-post-submit-checklist.md`](../walrus-track-post-submit-checklist.md) · [`docs/walrus-memory-alignment.md`](../walrus-memory-alignment.md)

---

## 1. Purpose

After submission, close the **demonstration and narrative gaps** between what the Walrus track asks for and what judges can verify in ~5 minutes — **without removing or weakening shipped strengths**.

This spec is the **single source of truth** for Phases 10–17 in `ROADMAP.md`.

---

## 2. Strengths to preserve (do not regress)

These are **already real** in the repo. New work must extend, not replace, them.

| Strength | Evidence | Judge command / link |
|----------|----------|----------------------|
| Hybrid local → redact → gate → Walrus | `MemorySyncService.pushOne` | `pnpm agent:demo` |
| PII redaction before durable write | `redactForUpstream`, ADR-010 | Vitest sync tests |
| Quality gate (baseline) | `scoreQuality` in `local-memory` | push skip reason `gate` |
| MCP universal access (9+ tools) | `packages/mcp` | `pnpm mcp:e2e` |
| Layered `verify` + proof JSON | `verify-memory.ts`, MCP `verify` | MCP `search(includeProof)` |
| Lineage + versioning | `getLineage`, metadata keys | MCP docs |
| Mainnet Move economy | marketplace, bounty, royalty | `pnpm contracts:info` |
| 2-agent bounty swarm (baseline) | `agent:bounty-hunt` | `pnpm agent:bounty-hunt` |
| Honest stub labeling | `SUBMISSION.md` §4 | — |
| Doc Hub + judge runbook | `/doc-hub/`, `JUDGE_GUIDE.md` | live dashboard |
| Production companion (long-running) | [special-one-agent](https://github.com/Olympusxvn/special-one-agent) | `docs/companion-mvp-special-one-agent.md` |

**Rule:** Any PR touching sync, MCP, or demos must keep `pnpm check`, Vitest, `pnpm mcp:e2e`, `pnpm agent:demo`, and `pnpm agent:bounty-hunt` green **offline**.

---

## 3. Track pillars → gap map

Official track themes (problem statement + workshop) mapped to repo status:

| Track pillar | Gap ID | Current state | Target phase |
|--------------|--------|---------------|--------------|
| Persistent verifiable memory | — | **Strong** | Maintain |
| Multi-agent coordination | **A** | Partial (2-agent, same process) | Phase 11 |
| Long-running workflows | **B** | Companion only; CLI one-shot | Phase 14 |
| Artifact-driven workflows | **C** | Not implemented | Phase 12 |
| Verifiable + portable | **E** | Code exists; judge path weak | Phase 12 |
| Intelligent hybrid sync | **D** | Length/word gate only | Phase 13 |
| Privacy / Seal story | **F** | Managed relayer + local redact | Phase 16 (docs first) |
| Developer tooling | partial | MCP ✓; profiles/adapters ○ | Phase 17 |
| Dashboard Walrus UX | **G** | Kiosk placeholder | Phase 15 |
| Benchmarks / credibility | **H** | Not documented | Phase 15 |

---

## 4. Gap specifications

### Gap A — Multi-agent shared memory on Walrus

**Track ask:** Share context across agents and workflows; multi-agent coordination.

**Problem today:** `agent:bounty-hunt` runs Poster + Hunter **sequentially in one process**. Judges may not see “Agent B reads memory Agent A promoted on Walrus.”

**Deliverables:**

| ID | Deliverable | Acceptance |
|----|-------------|------------|
| A1 | `pnpm agent:shared-memory` (or extend bounty-hunt to 3 agents) | Exit 0 offline; steps labeled Research → Analyst → Executor |
| A2 | Shared namespace + visible `walrusBlobId` per agent row | Summary table: `agentId \| memoryId \| walrusBlobId \| hitSource` |
| A3 | Hunter/Analyst uses `pullQuery` with `forceDurable: true` | Log: “Injected N chars from hybrid memory” or durable-only path |
| A4 | Optional: second process / fresh `MEMWAL_DB_PATH` recall | Document in `JUDGE_GUIDE.md` Path D |
| A5 | Doc Hub + SUBMISSION track row updated | One verify command per gap |

**Non-goals:** Real-time concurrent agents; distributed orchestration framework.

**Primary files:** `apps/agent-swarm/src/swarm/`, `packages/core/src/agent/`, root `package.json` script.

---

### Gap B — Long-running workflow

**Track ask:** Agents track state over hours/days (research, monitoring, trading).

**Problem today:** Main repo demos complete in ~30s. Long-running proof lives in **special-one-agent** (separate repo).

**Deliverables:**

| ID | Deliverable | Acceptance |
|----|-------------|------------|
| B1 | SUBMISSION + Doc Hub: Special One as **first-class** long-running proof | 30s judge walkthrough linked above fold |
| B2 | `docs/companion-mvp-special-one-agent.md` cross-links to track map | Bidirectional |
| B3 | Optional: `agent:resume-session` stub — load namespace, recall, continue task | Exit 0 offline; simulates “day 2” recall |
| B4 | Demo video chapter marker “Long-running” | Script in `scripts/demo-video/README.md` |

**Non-goals:** Full Mr. Toxic feature parity in monorepo.

---

### Gap C — Artifact-driven workflows

**Track ask:** Files, datasets, reports, intermediate outputs on Walrus.

**Deliverables:**

| ID | Deliverable | Acceptance |
|----|-------------|------------|
| C1 | MCP tool `saveArtifact` | `{ name, content, mime?, namespace }` → local row + optional promote |
| C2 | Metadata `artifact: true`, `artifactName` | Search/recall can filter by tag |
| C3 | Demo step: save JSON report → sync → second agent recall | In shared-memory or bounty flow |
| C4 | OpenSpec + `packages/mcp/docs/TOOLS.md` updated | Tool schema documented |

**v1 scope:** Text/JSON/markdown only (no binary Walrus upload separate from MemWal remember path).

---

### Gap D — Intelligent upload decision (Smart Hybrid Sync v1)

**Track / product ask:** Not everything should sync; semantic importance, frequency, privacy.

**Problem today:** `scoreQuality` uses length + word density only (`packages/local-memory/src/quality-scorer.ts`).

**Deliverables (v1 — not full 6-factor engine):**

| ID | Deliverable | Acceptance |
|----|-------------|------------|
| D1 | `RememberOptions.promote?: 'auto' \| 'local' \| 'walrus'` | `walrus` bypasses score gate (still redacts PII); `local` never pushes |
| D2 | Metadata boosts: `important`, `role=bounty-*`, tag `@walrus` / `@local` | Unit tests for score adjustment |
| D3 | `accessCount` on local rows; increment on recall/search hit | Used as +score input (threshold configurable) |
| D4 | Env `MEMWAL_UPLOAD_THRESHOLD` (default 65) | Document in `.env.example` |
| D5 | `shouldUploadToWalrus()` in `local-memory` or `core` | Called from `pushOne`; logs decision reason |

**v2 backlog (Phase 17+):** Full multi-factor matrix from product research doc; semantic classifier; cost model.

**Reference design:** User research `MemWal_Hybrid_MCP.md` Phase 1.2c; [`docs/product/sovereign-memory-roadmap-discussion.md`](../product/sovereign-memory-roadmap-discussion.md) Phase 10.

---

### Gap E — Verifiable + portable (judge-visible)

**Track ask:** Verifiable data; portable across platforms/agents.

**Problem today:** `verify` and `includeProof` exist but no dedicated **5-minute judge path**.

**Deliverables:**

| ID | Deliverable | Acceptance |
|----|-------------|------------|
| E1 | `JUDGE_GUIDE.md` Path D: Portable memory | remember → sync → export proof → fresh DB → recall forceDurable → verify PASS |
| E2 | Extend `pnpm mcp:e2e` or `pnpm mcp:e2e:portable` | Asserts verify valid on rehydrated row |
| E3 | Doc Hub “60s verify” includes portable step | Mermaid flow |
| E4 | Optional facade: `restore()` smoke documented | Already `pnpm memwal:restore-smoke` — link from Path D |

**Non-goals:** zk-proof; heavy PoI cryptography.

---

### Gap F — Privacy & Seal trust model

**Track mention:** Seal encryption layer.

**Deliverables (documentation-first):**

| ID | Deliverable | Acceptance |
|----|-------------|------------|
| F1 | Trust model table in SUBMISSION + Doc Hub | Managed relayer vs MemWalManual vs self-host |
| F2 | `docs/walrus-memory-alignment.md` § trust linked from PROJECT | Single pitch line for judges |
| F3 | Optional: `MEMWAL_MANUAL=1` path spike doc | ADR or decision record only |

**Deferred:** Wire MemWalManual, self-hosted relayer, TEE — see [`docs/walrus-memory-alignment.md`](../walrus-memory-alignment.md) P2.

---

### Gap G — Dashboard Walrus metrics

**Track ask:** Polish UI; show Walrus usage and verification.

**Deliverables:**

| ID | Deliverable | Acceptance |
|----|-------------|------------|
| G1 | Dashboard panel: blobs promoted, verify status, namespace count | Reads from local stats API or env-driven demo data |
| G2 | Link to [memory.walrus.xyz](https://memory.walrus.xyz) + Suiscan for live demos | Footer or Doc Hub |
| G3 | Kiosk placeholder labeled “indexer pending” | No fake live listings |

**Depends on:** Phase 8 indexer (P3 backlog) for production-grade metrics.

---

### Gap H — Benchmarks

**Deliverables:**

| ID | Deliverable | Acceptance |
|----|-------------|------------|
| H1 | `docs/benchmarks/hybrid-memory.md` | Table: local recall p95, push async latency, durable recall |
| H2 | One script `pnpm bench:recall` (optional) | Outputs JSON or markdown row |
| H3 | Doc Hub / slides one chart or table | Judge credibility |

**Non-goals:** Rigorous academic benchmark suite.

---

## 5. Execution tiers

### Tier S — Narrative (minimal code, high judge impact)

| Order | Item | Gaps | Owner surface |
|-------|------|------|---------------|
| S1 | Track mapping table in SUBMISSION §3 + Doc Hub | All | `SUBMISSION.md`, `docs/doc-map.html` |
| S2 | Elevate Special One to hero long-running proof | B | SUBMISSION, README, companion doc |
| S3 | Demo video / slides storyboard: multi-agent + verify | A, E | `scripts/demo-video/` |
| S4 | “5-minute agent integration” section | tooling | `docs/mcp-setup.md`, README |

**Exit:** Judge can map each track bullet → command or URL without reading source.

---

### Tier A — High-impact implementation

| Order | Item | Gaps | Phase |
|-------|------|------|-------|
| A1 | 3-agent shared memory demo | A | 11 |
| A2 | MCP `saveArtifact` | C | 12 |
| A3 | Portable verify judge path + E2E | E | 12 |
| A4 | Upload decision v1 (`promote`, threshold, accessCount) | D | 13 |

**Exit:** New scripts in judge quick links; CI green.

---

### Tier B — Polish & competitive (post–Tier A)

| Order | Item | Gaps | Phase |
|-------|------|------|-------|
| B1 | MCP profiles (Cursor / Claude / OpenClaw) | tooling | 17 |
| B2 | Dashboard Walrus stats panel | G | 15 |
| B3 | Benchmark doc + optional script | H | 15 |
| B4 | `agent:resume-session` stub | B | 14 |
| B5 | Auto-capture hooks (oc-memwal alignment) | tooling | 17 |
| B6 | SQLite FTS5 hybrid search mode | D/tooling | 17 |

---

## 6. Explicitly deferred (future / non-urgent)

Do **not** block Tier S/A on these:

| Item | Rationale |
|------|-----------|
| zk-proof / heavy proof-of-inclusion | `contentHash` + verify sufficient for hackathon |
| Full CrewAI / LangGraph / AutoGen adapter | One `examples/` snippet enough for “integration story” |
| Production indexer + kiosk E2E | P3 in `walrus-memory-alignment.md` |
| MemWalManual / self-hosted relayer / TEE | Enterprise horizon |
| `analyze()` / `ask()` / `withMemWal` facade | P2 SDK gaps |
| Sovereign Memory Vault + Auditor LLM | Phase 10–14 discussion doc — R&D |
| npm publish `@memwalpp/mcp` | Product ops, not track demo |
| Real WAL bridging | Demo coin only |

---

## 7. Phase mapping (ROADMAP)

| Phase | Name | Tier | Gaps |
|-------|------|------|------|
| **10** | Track narrative polish | S | all (docs) |
| **11** | Multi-agent shared memory | A | A |
| **12** | Artifacts + portable verify | A | C, E |
| **13** | Smart upload decision v1 | A | D |
| **14** | Long-running integration | S + B | B |
| **15** | Dashboard metrics + benchmarks | B | G, H |
| **16** | Trust model & Seal (docs) | B | F |
| **17** | Developer tooling expansion | B | profiles, auto-capture, FTS5 |

Phases 10–14 are **priority** for track storytelling; 15–17 run in parallel when capacity allows.

---

## 8. Verification gates (every phase)

Before marking a phase complete:

```bash
pnpm run check
pnpm test
pnpm mcp:e2e
pnpm agent:demo
pnpm agent:bounty-hunt
# After Phase 11:
pnpm agent:shared-memory   # when added
# After Phase 12:
pnpm mcp:e2e:portable      # when added
```

Move tests unchanged unless chain modules touched: `pnpm contracts:test`.

---

## 9. Success criteria (post-submit milestone)

| Criterion | Measure |
|-----------|---------|
| Track map complete | Every official pillar → evidence row in SUBMISSION |
| Multi-agent visible | 3 agents, shared blob ids in CLI output |
| Artifacts | At least one JSON/report artifact promoted and recalled |
| Portable | Judge Path D reproducible in &lt;5 min |
| Smart sync v1 | `promote: 'walrus' \| 'local'` + threshold env |
| No regression | Offline judge path unchanged |
| Checklist | [`docs/walrus-track-post-submit-checklist.md`](../walrus-track-post-submit-checklist.md) ≥ 80% Tier S+A |

---

## 10. References

- User research (local): `MemWal_Hybrid_MCP.md`, `Walrus_Track_Problem_Statement.md`
- Workshop map: [`docs/judge-walrus-memory-workshop.md`](../judge-walrus-memory-workshop.md)
- Alignment backlog: [`docs/walrus-memory-alignment.md`](../walrus-memory-alignment.md)
- Sovereign horizon: [`docs/product/sovereign-memory-roadmap-discussion.md`](../product/sovereign-memory-roadmap-discussion.md)
