# Git branching and versioning — MemWal Agent Memory

Optimized for a **short, high-intensity hackathon** with a **single integration line** and optional demo tags.

## Branching (trunk-based, lightweight)

| Pattern | Use |
|---------|-----|
| `main` | Always deployable / demo-ready; PRs merge here after `pnpm run check` (and Move job when contracts touched). |
| `feat/<topic>` or `fix/<topic>` | Short-lived branches from `main`; rebase or merge-back frequently. |
| `demo/<label>` | Optional freeze for judge recording (tag instead if possible). |

**Not used by default:** long-lived `develop`, Git Flow release branches — unnecessary overhead for Overflow timeline.

## Pull requests

- One vertical slice or one package concern per PR when practical.
- CI must pass: see [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

## Versioning

### Workspace npm packages (`@memwalpp/*`, apps)

- **Pre-release / hackathon:** keep **`0.0.x`** or **`0.1.x`** in `package.json` files; bump **patch** for any published artifact or judge handoff.
- **Lockstep optional:** all `packages/*` may share `0.0.1` until first npm publish; thereafter bump only packages that changed for clarity.

### Git tags

- **`v0.1.0-overflow`** style tags for submission milestones (optional but recommended before final video).
- Tag message should list: Sui package ID (if any), MemWal relayer URL used in demo, commit SHA.

### Move on-chain versioning

- Governed by **`Move.toml`** revision and published address; document upgrades in the relevant ADR or `docs/deploy.md`.

## Files that must never be committed

- `.env`, `.env.local`, any file containing **raw private keys** or MemWal delegate secrets.
- Local “key cheat sheets” (e.g. `Key_hackathon*.md`) — keep outside the repo or in a password manager.
