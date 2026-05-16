# Changelog

All notable changes to this project are documented here. Operational and tooling lessons are included so CI regressions are easier to avoid.

Format inspired by [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Changed

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
