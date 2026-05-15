# Roadmap — Memory Marketplace (MemWal++)

## Milestone + artifact (tóm tắt)

| Phase | Milestone | Artifact bắt buộc (deliverable) |
|-------|-----------|----------------------------------|
| **0** | Project setup | GSD: `PROJECT.md` / roadmap; OpenSpec/ADR: kiến trúc monorepo + ranh giới package (**ADR-013**); repo: `pnpm-workspace`, `turbo`, CI, `.env.example`, [`docs/GIT-AND-VERSIONING.md`](docs/GIT-AND-VERSIONING.md). |
| **1** | Foundation packages | OpenSpec: contract `shared` / types / `local-memory`; GSD plan + code; `pnpm run check` xanh; API foundation “đóng” — không import vòng. |
| **2** | MemWal integration | OpenSpec Phase 2 durable sync; GSD plan; `@memwalpp/memwal-client` facade + **`DurableMemoryStore`**; **`MemorySyncService`** in `core`; peer `@mysten/sui` khớp SDK. |
| **3** | Sui Move contracts ✓ | OpenSpec + GSD; Move sources + `sui move test`; [`deploy.md`](docs/deploy.md) + [`deploy-manifest.json`](packages/sui-contracts/deploy-manifest.json); TS `moveTarget` in shared. |
| **4** | Autonomous agents + submission | Agent hooks + demos ✓; [`SUBMISSION.md`](SUBMISSION.md); judge path `pnpm agent:demo`. |

**Thứ tự công cụ (Phase 1+):** OpenSpec → GSD → Superpowers (implement) → Review → Acceptance.

**Phụ thuộc:** Có thể song song **minimum Move publish** với cuối Phase 2 nếu demo cần `packageId` sớm.

---

## Chi tiết theo phase (exit criteria)

| Phase | Exit criteria (PASS khi) |
|-------|---------------------------|
| **0** | `PROJECT.md`, `ROADMAP.md` (bảng này), `docs/ARCHITECTURE.md`, `docs/decisions/ADR-013.md`, `pnpm-workspace.yaml`, `turbo.json`, root `package.json`, `.env.example`, CI cài đặt + check/lint/build xanh trên PR. |
| **1** | `shared` / `local-memory` (và types liên quan) có spec ngắn hoặc ADR pointer; không có cycle `packages/*`; `pnpm run check` toàn monorepo. |
| **2** | `docs/specs/openspec-memwal-client.md` acceptance ✓; consumer chỉ import `@memwalpp/memwal-client` cho remember/recall facade. |
| **3** | Move build + test trong CI; package ID + object IDs trong `docs/deploy.md`, `SUBMISSION.md`, `pnpm contracts:info`. |
| **4** | Agent flow demo được mô tả + một đường chạy (`pnpm demo` hoặc script tương đương) dùng hooks/MemWal theo ADR-005/010. |
