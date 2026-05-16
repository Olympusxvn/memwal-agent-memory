# Deploy `apps/dashboard` to Vercel

## One-time import

1. [Import](https://vercel.com/new) the GitHub repo `Olympusxvn/memwalpp`.
2. **Root Directory:** `apps/dashboard` (required for this monorepo).
3. **Framework Preset:** Next.js (auto-detected).
4. **Node.js:** 20.x (matches root `engines.node`).
5. **Install / Build:** leave default if Vercel reads `apps/dashboard/vercel.json`; otherwise:
   - Install: `cd ../.. && pnpm install --frozen-lockfile`
   - Build: `cd ../.. && pnpm exec turbo run build --filter=dashboard...`

Repo root `vercel.json` documents the same turbo filter when deploying from the repository root.

## Environment variables (Vercel → Project → Settings)

| Variable | Value | Required |
|----------|--------|----------|
| `NEXT_PUBLIC_SUI_NETWORK` | `mainnet` | Yes (also in `.env.production`) |
| `NEXT_PUBLIC_MARKETPLACE_PACKAGE_ID` | `0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050` | Yes |

Optional overrides: see root `.env.example`.

## Local production smoke test

```bash
# from repository root
pnpm install
pnpm exec turbo run build --filter=dashboard...
cd apps/dashboard && pnpm start
```

## Notes

- `pnpm` version is pinned via root `packageManager` (`pnpm@10.18.2`).
- Workspace packages `@memwalpp/shared` and `@memwalpp/ui` are built via turbo `^build` before `dashboard` builds.
- Do not set `output: "standalone"` in `next.config.ts` for Vercel-hosted deployments.
