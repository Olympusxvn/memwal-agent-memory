# Cursor handoff — MemWal Agent Memory

Session resume notes (**no private keys**). Prefer canonical docs: [PROJECT-STRUCTURE.md](PROJECT-STRUCTURE.md), [deploy.md](deploy.md).

## GitHub

- **Repository:** https://github.com/Olympusxvn/memwal-agent-memory
- **Default branch:** `main`
- **Live dashboard:** https://memwalpp-dashboard.vercel.app/
- **Summary (judges):** https://memwalpp-dashboard.vercel.app/summary

## Workspace path

- Repo folder: **`memwal-agent-memory/`** (npm root name `memwalpp`, display **MemWal++** / **MemWal Agent Memory**).
- Move: `packages/sui-contracts/sources/`
- Walrus sync: `packages/core/src/memory/memory-sync-service.ts`
- MCP: `packages/mcp/` — `pnpm mcp:e2e`

## Mainnet (smart contracts)

- **Package ID:** `0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050`
- **Published-at (v3 PTBs):** `0x9de4c63e976b5244fc7a5378134c9a87030ef534491f8a6919698e7379a2b711`
- **Suiscan:** https://suiscan.xyz/mainnet/object/0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050
- **v2 Config:** `0x52ea5aa40b38de760c3faa08bd83cd047e4d63023091f14774a8a87609f0ecd1`
- **v2 MarketplaceV2:** `0xfaddc1f4fe0f82a84d885b47a1202e37dc8f0a87040a7df7ff3e4268566c488f`
- Full PTB + bootstrap: [deploy.md](deploy.md)

### Pitch to judges (don’t mis-state)

- **`wal`:** In-package **demo WAL** — marketplace/bounty use this package’s `Coin<WAL>`.
- **`delegate_bridge` / `access_policy`:** On-chain events + pack fields; Seal/MemWal revoke composition stays in TS PTB when wired.
- **Agent demos:** Bounty **metadata stub** in CLI; Move bounty module + mainnet IDs are **real**.
- **Walrus:** Real via MemWal when `MEMWAL_*` + `MEMWAL_AUTO_PUSH=1`; offline skip is expected without env.

## Env (do not commit secrets)

See [`.env.example`](../.env.example): `MEMWAL_PRIVATE_KEY`, `MEMWAL_ACCOUNT_ID`, `MEMWAL_SERVER_URL`, chain delegate vars for kiosk.

Browser-safe: `NEXT_PUBLIC_MARKETPLACE_PACKAGE_ID` (see `apps/dashboard/.env.production`).

## Judge smoke

```bash
pnpm install && pnpm mcp:build && pnpm mcp:e2e && pnpm agent:demo && pnpm agent:bounty-hunt
```

## ADRs & plans

- ADRs: `docs/decisions/`
- Architecture: `docs/ARCHITECTURE.md`
- Internal GSD plans: `docs/process/plans/` (optional)
