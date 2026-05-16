# Changelog

All notable changes to this project are documented here. Operational and tooling lessons are included so CI regressions are easier to avoid.

Format inspired by [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Changed

- **Vercel:** root `vercel.json` (no `rootDirectory` key — set **Root Directory = `apps/dashboard`** in Vercel UI), `outputDirectory: .next`, turbo `--filter=@memwalpp/dashboard`, `.env.production` / `.env.example`, `DEPLOY_VERCEL.md`.
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

**1. Double path: `apps/dashboard/apps/dashboard/.next`**

- Set **Root Directory = `apps/dashboard`** in the **Vercel project settings** (not in `vercel.json` — the schema rejects **`rootDirectory`** as an unknown property).
- With that root, paths in `vercel.json` are **relative to `apps/dashboard`**.
- **`outputDirectory: apps/dashboard/.next`** (or the same path in the Vercel UI) resolves to **`apps/dashboard/apps/dashboard/.next`** → deploy fails with “Output Directory not found”.
- **Fix:** **`outputDirectory: ".next"`** only. In the Vercel dashboard, clear any manual Output Directory override or set it to **`.next`**, not `apps/dashboard/.next`.

**2. One `vercel.json` at the repository root**

- Do **not** add a second **`apps/dashboard/vercel.json`** — it merges with the root file and duplicates install/build/output rules.
- Install and turbo must run from the **monorepo root** when Root Directory is `apps/dashboard`:
  - `installCommand`: `cd ../.. && pnpm install --no-frozen-lockfile --ignore-scripts`
  - `buildCommand`: `cd ../.. && pnpm exec turbo run build --filter=@memwalpp/dashboard --filter=!memwalpp-cli`

**3. Turbo filter and package name**

- Workspace package name must be **`@memwalpp/dashboard`** (`apps/dashboard/package.json` `name` field) — filters like `dashboard` or `@memwalpp/dashboard...` can pull the wrong graph.
- Use **`--filter=@memwalpp/dashboard`** (no trailing **`...`**) for a focused deploy: turbo still runs **`dependsOn: ["^build"]`** so **`@memwalpp/shared`** and **`@memwalpp/ui`** build, without building unrelated apps.
- Exclude CLI from the deploy graph: **`--filter=!memwalpp-cli`** so **`memwalpp-cli`** is not built on Vercel when only the dashboard is deployed.

**4. Turbo `outputs` in `turbo.json`**

- Put **`.next/**`** only on **`@memwalpp/dashboard#build`** (e.g. `[".next/**", "!.next/cache/**"]`), plus **`env`** for `NEXT_PUBLIC_SUI_NETWORK` and `NEXT_PUBLIC_MARKETPLACE_PACKAGE_ID`.
- Do **not** put **`.next/**`** on the generic **`build`** task — other packages are not Next apps and Turbo will warn or cache incorrectly.
- Packages with **`tsc --noEmit`** only: **`outputs: []`** on `@memwalpp/shared#build`, `@memwalpp/ui#build`, `@memwalpp/core#build`, etc.
- **`memwalpp-cli#build`** can use **`outputs: ["dist/**"]`** when built locally; it is excluded from the Vercel filter above.

**5. Install and scripts**

- **`pnpm install --no-frozen-lockfile`** on Vercel can unblock deploys right after lockfile changes; keep **`--frozen-lockfile`** in GitHub Actions once the lockfile is committed.
- **`--ignore-scripts`** on Vercel avoids native postinstall (e.g. `better-sqlite3`) for the dashboard app, which does not need them.
- Dashboard **`build`** script stays **`next build`**; Vercel/turbo orchestration lives in root **`vercel.json`**, not in duplicated per-app deploy config.

**6. Pitfalls**

- Do **not** set **`ignoreCommand`** to a command that always exits **0** (e.g. `echo 'ignoring build'`) — Vercel treats that as “skip this deployment” for every push.
- Do **not** use **`output: "standalone"`** in `next.config.ts` for Vercel-hosted Next.js unless self-hosting in Docker.

**7. Dashboard env (mainnet)**

- Committed defaults: **`apps/dashboard/.env.production`** — `NEXT_PUBLIC_SUI_NETWORK=mainnet`, `NEXT_PUBLIC_MARKETPLACE_PACKAGE_ID=…`.
- Local dev: **`cp apps/dashboard/.env.local.example .env.local`** (`.env.local` is gitignored).
