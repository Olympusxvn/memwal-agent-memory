# Changelog

All notable changes to this project are documented here. Operational and tooling lessons are included so CI regressions are easier to avoid.

Format inspired by [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Changed

- **Vercel:** root `vercel.json` (`rootDirectory: apps/dashboard`, `outputDirectory: .next`), `apps/dashboard/vercel.json`, package **`@memwalpp/dashboard`**, `.env.production` / `.env.example`, `DEPLOY_VERCEL.md`; turbo build `--filter=@memwalpp/dashboard...`.
- **`pnpm test`** still runs the ordered package matrix; **`pnpm test:turbo`** runs `turbo run test` for packages that define a `test` script.
- **`@memwalpp/local-memory` / `@memwalpp/memwal-client`:** default `test` script is now **`vitest run`** (CI-friendly); use **`pnpm run test:watch`** for watch mode.
- **Dashboard:** `SuiClientProvider` registers mainnet/testnet/devnet; default network follows **`NEXT_PUBLIC_SUI_NETWORK`** with safe fallback to mainnet.

### CI / DevOps — lessons learned (2026-05)

**pnpm lockfile vs GitHub Actions**

- `CI=true` is the default on GitHub-hosted runners. **pnpm uses a frozen lockfile** in that environment: any `package.json` change (for example a new `workspace:*` dependency) must be followed by a **local** `pnpm install` and a **committed** `pnpm-lock.yaml` update, or install fails with `ERR_PNPM_OUTDATED_LOCKFILE`.
- Prefer `pnpm install --frozen-lockfile` explicitly in workflows so behavior matches local expectations once the lockfile is correct.

**Sui CLI in the Move job**

- Install from the official MystenLabs release asset: `sui-<SUI_RELEASE_TAG>-ubuntu-x86_64.tgz` (see [Sui releases](https://github.com/MystenLabs/sui/releases)); the tag must match a published release.

**`sui: command not found` despite `GITHUB_PATH`**

- Appending the install directory to `$GITHUB_PATH` is not always enough for later steps (e.g. when using `working-directory` or when PATH propagation is subtle).
- **Reliable pattern:** after extract, `test -x` the binary, write **`SUI_BINARY=<absolute-path>/sui`** to **`$GITHUB_ENV`**, run `"$SUI_BINARY" --version`, then invoke **`"$SUI_BINARY" move build`** / **`move test`** instead of bare `sui`.
- Optionally still append the directory to `$GITHUB_PATH` for tooling that shells out to `sui` without an explicit path.

**Caching**

- Cache the **extracted** directory (e.g. `${GITHUB_WORKSPACE}/.cache/sui-cli`) with `actions/cache` keyed by `SUI_RELEASE_TAG` and bump the cache key when the install layout or tag changes.

**Verification**

- Run `sui --version` (or `"$SUI_BINARY" --version`) in the workflow **after** install or cache restore and **before** `move build` / `move test`.

### Vercel + Turborepo monorepo — lessons learned (2026-05)

**Double `apps/dashboard` in the output path**

- With **`rootDirectory: apps/dashboard`**, every path in `vercel.json` is relative to that folder.
- Setting **`outputDirectory: apps/dashboard/.next`** makes Vercel look for **`apps/dashboard/apps/dashboard/.next`** and the deploy fails.
- **Fix:** use **`outputDirectory: ".next"`** (or leave Next.js default) when the app root is already `apps/dashboard`.

**Turbo filter must match `package.json` `name`**

- The dashboard app is published in the workspace as **`@memwalpp/dashboard`** (not `dashboard`).
- Build from the monorepo root: **`pnpm exec turbo run build --filter=@memwalpp/dashboard...`** — the trailing **`...`** builds workspace dependencies (`@memwalpp/shared`, `@memwalpp/ui`) first.

**Turbo `outputs` per package**

- Next.js app: declare **`@memwalpp/dashboard#build`** with **`outputs: [".next/**", "!.next/cache/**"]`** in `turbo.json`.
- Packages whose `build` is only **`tsc --noEmit`** produce no artifacts — set **`outputs: []`** on `@memwalpp/shared#build`, `@memwalpp/ui#build`, etc., so Turbo does not warn “no output files found” and remote cache stays predictable.

**Install on Vercel**

- **`pnpm install --no-frozen-lockfile`** can unblock first deploys when the lockfile was just updated; prefer syncing and committing **`pnpm-lock.yaml`**, then tighten to **`--frozen-lockfile`** in CI once stable.
- With **Root Directory = `apps/dashboard`**, keep **`apps/dashboard/vercel.json`** install/build as **`cd ../.. && …`** so pnpm still runs at the **repository root** (workspace root).

**Dashboard env (mainnet)**

- Commit safe defaults in **`apps/dashboard/.env.production`**: `NEXT_PUBLIC_SUI_NETWORK=mainnet`, `NEXT_PUBLIC_MARKETPLACE_PACKAGE_ID=…`.
- Local dev: copy **`apps/dashboard/.env.local.example`** → **`.env.local`** (gitignored).

**Do not use `output: "standalone"` in `next.config.ts` for Vercel-hosted Next.js** unless you self-host in Docker; Vercel runs `next build` natively.
