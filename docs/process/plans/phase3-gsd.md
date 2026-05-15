# GSD plan — Phase 3: Sui Move contracts

**OpenSpec:** [`openspec-move-contracts.md`](../../specs/openspec-move-contracts.md)  
**Deploy:** [`deploy.md`](../../deploy.md)

---

## Wave 3.0 — Documentation & manifest (this PR)

| # | Task | Artifact | Status |
|---|------|----------|--------|
| 3.0.1 | OpenSpec modules, events, escrow | `openspec-move-contracts.md` | ✓ |
| 3.0.2 | Deploy manifest JSON | `packages/sui-contracts/deploy-manifest.json` | ✓ |
| 3.0.3 | Deploy guide | `docs/deploy.md` | ✓ |
| 3.0.4 | Package README | `packages/sui-contracts/README.md` | ✓ |
| 3.0.5 | TS constants in shared | `packages/shared/src/deployed-package.ts` | ✓ |
| 3.0.6 | `pnpm contracts:info` script | `scripts/move-package-info.ts` | ✓ |
| 3.0.7 | README / SUBMISSION / ARCHITECTURE / ROADMAP | docs | ✓ |

---

## Wave 3.1 — Tests & indexer (follow-up)

| # | Task | Deps |
|---|------|------|
| 3.1.1 | Move tests: bounty happy path + cancel | `bounty.move` |
| 3.1.2 | Move tests: marketplace list/buy | `marketplace.move` |
| 3.1.3 | Indexer worker consuming events | `indexer-schema.sql` |
| 3.1.4 | Dashboard PTB: `mint_pack` + `list_pack` | deploy manifest |

---

## Wave 3.2 — Production WAL bridge (optional)

| # | Task |
|---|------|
| 3.2.1 | Document swap from package WAL → ecosystem WAL |
| 3.2.2 | Seal PTB with official Seal package IDs |

---

## Exit criteria (Phase 3 — PASS)

- [x] `sui move test` green locally / CI  
- [x] Package ID + mainnet object IDs in `docs/deploy.md`  
- [x] Judge can find module/event reference without reading Move sources  
- [ ] Full indexer + dashboard PTB (Wave 3.1 — not blocking manifest/docs)
