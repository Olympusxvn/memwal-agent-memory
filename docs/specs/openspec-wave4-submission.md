# OpenSpec — Wave 4: Polish & hackathon submission (Sui Overflow 2026 · Walrus Track)

**Change ID:** `wave4-submission-polish`  
**Status:** Implementing  
**Audience:** Hackathon judges, reviewers, integrators

---

## 1. Deliverables

| ID | Deliverable | Location |
|----|-------------|----------|
| D1 | Judge-ready CLI demos | `pnpm agent:demo`, `pnpm agent:bounty-hunt` |
| D2 | Submission brief | `SUBMISSION.md` |
| D3 | Contributor + judge docs | `README.md`, `docs/ARCHITECTURE.md` |
| D4 | Environment template | `.env.example` |
| D5 | CI-green verification | `pnpm check`, `pnpm build`, `pnpm test` |

---

## 2. Judge experience (5-minute path)

| Step | Action | Expected output |
|------|--------|-----------------|
| 1 | `pnpm install` | deps install |
| 2 | `pnpm agent:demo` | Step banner, memory injected, exit 0 **without** MemWal keys |
| 3 | `pnpm agent:bounty-hunt` | Poster + Hunter steps, summary table, exit 0 |
| 4 | (Optional) Set `MEMWAL_*` + `MEMWAL_AUTO_PUSH=1` | `pushOne` shows Walrus `blobId` |
| 5 | Read `SUBMISSION.md` | Walrus integration bullets + package ID |

---

## 3. Demo polish requirements

- Structured **step labels** (1/N) and **RESULT** block at end
- No raw secrets; no full memory dumps in logs (truncate previews)
- Offline path clearly labeled; live path shows `blobId` when promoted
- Shared `demo-log.ts` utility in `apps/agent-swarm`

---

## 4. Documentation requirements

### README

- Badges (Sui Overflow, Walrus track, pnpm, TypeScript)
- **Judge quick start** (copy-paste block)
- Link to `SUBMISSION.md`, architecture diagram, published package ID

### ARCHITECTURE

- Walrus Track **highlights** section (MemWal → Walrus blob, PoA narrative)
- Judge demo flow cross-link
- Mermaid hybrid-sync diagram (optional inline)

### SUBMISSION.md

- Problem / solution (1 paragraph each)
- Features list (Phases 0–3)
- How to run (commands)
- Walrus integration points (code paths)
- On-chain package ID + explorer link
- AI disclosure (ADR-012)

---

## 5. Acceptance

| Check | PASS |
|-------|------|
| OpenSpec (this doc) | ✓ |
| Demo logs polished | ✓ |
| SUBMISSION.md | ✓ |
| README + ARCHITECTURE | ✓ |
| `.env.example` complete | ✓ |
| `pnpm check` + `pnpm build` + tests | ✓ |
