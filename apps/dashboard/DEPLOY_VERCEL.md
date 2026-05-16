# Deploy `apps/dashboard` to Vercel

## One-time import

1. [Import](https://vercel.com/new) the GitHub repo `Olympusxvn/memwalpp`.
2. **Root Directory:** `apps/dashboard` (required — set in Vercel UI only; not valid inside `vercel.json`).
3. **Framework Preset:** Next.js (auto-detected).
4. **Node.js:** 20.x (matches root `engines.node`).
5. **Do not** set Output Directory in the Vercel UI to `apps/dashboard/.next` — root `vercel.json` uses **`outputDirectory: ".next"`** relative to `apps/dashboard`.
6. **Install / Build** (from repo root `vercel.json`; Vercel runs these with monorepo-aware cwd when Root Directory is set):
   - Install: `pnpm install --no-frozen-lockfile`
   - Build: `turbo run build --filter=@memwalpp/dashboard`

Workspace deps (`@memwalpp/shared`, `@memwalpp/ui`) still build via turbo `dependsOn: ["^build"]`.

## Environment variables (Vercel → Project → Settings)

| Variable | Value | Required |
|----------|--------|----------|
| `NEXT_PUBLIC_SUI_NETWORK` | `mainnet` | Yes (also in `.env.production`) |
| `NEXT_PUBLIC_MARKETPLACE_PACKAGE_ID` | `0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050` | Yes |

Optional overrides: see root `.env.example`.

## Local env

```bash
cd apps/dashboard
cp .env.local.example .env.local   # mainnet + package id for `pnpm dev`
```

See also `.env.example` and committed `.env.production` (Vercel production build).

## Local production smoke test

```bash
# from repository root
pnpm install
cd apps/dashboard && pnpm run build:monorepo && pnpm start
```

## Notes

- `pnpm` version is pinned via root `packageManager` (`pnpm@10.18.2`).
- Workspace packages `@memwalpp/shared` and `@memwalpp/ui` are built via turbo `^build` before `dashboard` builds.
- Do not set `output: "standalone"` in `next.config.ts` for Vercel-hosted deployments.
