# Walrus Track — post-submit progress checklist

**Status:** Living document — update after each phase PR  
**Spec:** [`docs/specs/openspec-walrus-track-gaps.md`](specs/openspec-walrus-track-gaps.md)  
**Roadmap:** [`ROADMAP.md`](../ROADMAP.md) Phases 10–17  
**Last updated:** 2026-06-27

**Legend:** ☐ not started · ◐ in progress · ✓ done · — deferred (future)

---

## Overall progress

| Tier | Done | Total | Notes |
|------|------|-------|-------|
| **S** Narrative | 5 | 5 | Tier S complete (2026-06-27) |
| **A** Implementation | 4 | 4 | Demos + MCP + upload v1 ✓ |
| **B** Polish | 6 | 6 | Dashboard, benchmarks, tooling ✓ |
| **Strengths preserved** | 11 | 11 | Baseline at submit — do not regress |

**Target:** Complete Tier **S** + **A** before next judge-facing release tag.

---

## Strengths to preserve (baseline ✓ at submit)

| # | Item | Verify | Status |
|---|------|--------|--------|
| P1 | Hybrid sync pipeline | `pnpm agent:demo` | ✓ |
| P2 | PII redaction before Walrus | sync Vitest | ✓ |
| P3 | Quality gate (baseline) | push reason `gate` | ✓ |
| P4 | MCP stdio E2E | `pnpm mcp:e2e` | ✓ |
| P5 | Layered verify + proof | MCP `verify` | ✓ |
| P6 | Lineage / getLineage | MCP docs | ✓ |
| P7 | Mainnet Move package | `pnpm contracts:info` | ✓ |
| P8 | 2-agent bounty-hunt | `pnpm agent:bounty-hunt` | ✓ |
| P9 | Honest stub labeling | SUBMISSION §4 | ✓ |
| P10 | Doc Hub + JUDGE_GUIDE | `/doc-hub/` | ✓ |
| P11 | Companion long-running MVP | special-one-agent link | ✓ |

---

## Tier S — Narrative (priority 1)

| # | Task | Gap | Deliverable | Status |
|---|------|-----|-------------|--------|
| S1 | Track pillar → evidence table | all | SUBMISSION §3 expanded | ✓ |
| S2 | Doc Hub scoring lens + track map | all | `docs/doc-map.html` section | ✓ |
| S3 | Special One hero placement | B | README + SUBMISSION above fold | ✓ |
| S4 | Demo video storyboard (3-agent + verify) | A, E | `scripts/demo-video/README.md` | ✓ |
| S5 | “Integrate in 5 minutes” MCP section | tooling | `docs/mcp-setup.md` | ✓ |

---

## Tier A — Implementation (priority 2)

### Gap A — Multi-agent shared memory (Phase 11)

| # | Task | Acceptance | Status |
|---|------|------------|--------|
| A1 | Spec reviewed / locked | openspec-walrus-track-gaps §4.A | ✓ |
| A2 | `agent:shared-memory` script (3 agents) | exit 0 offline | ✓ |
| A3 | Summary table: agentId, blobId, hitSource | demo log | ✓ |
| A4 | `forceDurable` recall step documented | JUDGE_GUIDE Path G | ✓ |
| A5 | Root `package.json` script wired | `pnpm agent:shared-memory` | ✓ |
| A6 | ROADMAP Phase 11 marked complete | — | ✓ |

### Gap C — Artifacts (Phase 12)

| # | Task | Acceptance | Status |
|---|------|------------|--------|
| C1 | MCP `saveArtifact` tool | schema in TOOLS.md | ✓ |
| C2 | Metadata `artifact: true` | search filter | ✓ |
| C3 | Demo: report JSON promote + recall | shared-memory or bounty | ✓ |
| C4 | MCP E2E covers saveArtifact | test green | ✓ |

### Gap E — Portable verify (Phase 12)

| # | Task | Acceptance | Status |
|---|------|------------|--------|
| E1 | JUDGE_GUIDE Path G | 5-min portable flow | ✓ |
| E2 | `pnpm mcp:e2e:portable` (or extended e2e) | verify PASS | ✓ |
| E3 | Doc Hub 60s verify includes portable | mermaid | ✓ |
| E4 | Link `memwal:restore-smoke` from Path G | doc only | ✓ |

### Gap D — Smart upload v1 (Phase 13)

| # | Task | Acceptance | Status |
|---|------|------------|--------|
| D1 | `RememberOptions.promote` | auto \| local \| walrus | ✓ |
| D2 | `@walrus` / `@local` / `important` boosts | unit tests | ✓ |
| D3 | `accessCount` on recall/search | local store | ✓ |
| D4 | `MEMWAL_UPLOAD_THRESHOLD` env | .env.example | ✓ |
| D5 | `shouldUploadToWalrus()` + log reason | pushOne | ✓ |

---

## Tier B — Polish (priority 3)

### Gap B — Long-running (Phase 14)

| # | Task | Acceptance | Status |
|---|------|------------|--------|
| B1 | Companion doc bidirectional links | companion-mvp doc | ✓ |
| B2 | `agent:resume-session` stub (optional) | exit 0 offline | ✓ |
| B3 | Demo video “long-running” chapter | script | ✓ |

### Gap G — Dashboard (Phase 15)

| # | Task | Acceptance | Status |
|---|------|------------|--------|
| G1 | Walrus stats panel (blobs, verify) | dashboard page | ✓ |
| G2 | memory.walrus.xyz + Suiscan links | UI footer | ✓ |
| G3 | Kiosk “indexer pending” label | no fake data | ✓ |

### Gap H — Benchmarks (Phase 15)

| # | Task | Acceptance | Status |
|---|------|------------|--------|
| H1 | `docs/benchmarks/hybrid-memory.md` | latency table | ✓ |
| H2 | `pnpm bench:recall` script (optional) | JSON/md output | ✓ |
| H3 | Doc Hub one benchmark table | slides optional | ✓ |

### Gap F — Trust / Seal (Phase 16)

| # | Task | Acceptance | Status |
|---|------|------------|--------|
| F1 | Trust model in SUBMISSION + Doc Hub | table | ✓ |
| F2 | walrus-memory-alignment linked from PROJECT | link | ✓ |
| F3 | MemWalManual spike ADR (optional) | doc only | ✓ |

### Developer tooling (Phase 17)

| # | Task | Acceptance | Status |
|---|------|------------|--------|
| T1 | MCP profiles (cursor, claude, openclaw) | `profiles/` + docs | ✓ |
| T2 | Auto-capture hooks (oc-memwal align) | agent-swarm or plugin | ✓ |
| T3 | SQLite FTS5 hybrid search | local-memory | ✓ |
| T4 | `examples/crewai_memwal.py` snippet | optional | ✓ |

---

## Explicitly deferred (future)

| Item | Spec section | Status |
|------|--------------|--------|
| zk-proof / heavy PoI | openspec §6 | — |
| Full framework adapters | openspec §6 | — |
| Production indexer E2E | walrus-memory-alignment P3 | — |
| MemWalManual wired | walrus-memory-alignment P2 | — |
| analyze / ask / withMemWal facade | walrus-memory-alignment P2 | — |
| Sovereign Vault + Auditor LLM | sovereign-memory-roadmap | — |
| npm publish @memwalpp/mcp | product/npm-publish | — |
| Real WAL bridging | PROJECT non-goals | — |

---

## Phase completion rollup

| Phase | Name | Status | Blocked by |
|-------|------|--------|------------|
| **10** | Track narrative polish | ✓ | — |
| **11** | Multi-agent shared memory | ✓ | — |
| **12** | Artifacts + portable verify | ✓ | — |
| **13** | Smart upload v1 | ✓ | — |
| **14** | Long-running integration | ✓ | — |
| **15** | Dashboard + benchmarks | ✓ | — |
| **16** | Trust model & Seal docs | ✓ | — |
| **17** | Dev tooling expansion | ✓ | — |

---

## CI gate (run before marking any phase ✓)

```bash
pnpm run check
pnpm test
pnpm mcp:e2e
pnpm agent:demo
pnpm agent:bounty-hunt
pnpm contracts:test   # if Move touched
```

---

## Changelog (checklist updates)

| Date | Update |
|------|--------|
| 2026-06-13 | Tier B complete — resume-session, dashboard stats, benchmarks, trust model, FTS5, MCP profiles |
| 2026-06-27 | Tier S complete — SUBMISSION §3, Doc Hub track map, README hero, mcp-setup, demo storyboard |
| 2026-06-13 | Initial checklist from openspec-walrus-track-gaps v1.0; spec A1 locked |
