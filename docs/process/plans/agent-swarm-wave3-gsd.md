# GSD plan — Phase 3 / Wave 3: Agent swarm integration

**OpenSpec:** [`openspec-agent-swarm-integration.md`](../../specs/openspec-agent-swarm-integration.md)

---

## Wave 3.1 — Bridge & hooks

| # | Task | File | Deps |
|---|------|------|------|
| 3.1.1 | Add workspace deps (`core`, `local-memory`, `tsx`) | `apps/agent-swarm/package.json` | — |
| 3.1.2 | `SwarmHookContext` + `MemWalSwarmHooks` | `src/hooks/types.ts` | shared |
| 3.1.3 | `createMemWalSwarmHooks(sync, local, config)` | `src/hooks/memwal-swarm-hooks.ts` | MemorySyncService |
| 3.1.4 | `MemWalAgentBridge` implements `IMemWalAgent` | `src/bridge/memwal-agent-bridge.ts` | 3.1.3 |

---

## Wave 3.2 — Demos & CLI

| # | Task | File | Deps |
|---|------|------|------|
| 3.2.1 | Offline-safe `run-demo.ts` | `src/cli/run-demo.ts` | 3.1.x |
| 3.2.2 | 2-agent `run-bounty-hunt.ts` | `src/swarm/bounty-hunt.ts` | 3.1.x |
| 3.2.3 | Root scripts `agent:demo`, `agent:bounty-hunt` | root `package.json` | 3.2.1–2 |
| 3.2.4 | Stub bounty constants | `src/swarm/stub-bounty.ts` | shared |

---

## Wave 3.3 — OpenClaw artifacts & docs

| # | Task | Deps |
|---|------|------|
| 3.3.1 | `plugin/openclaw.plugin.json` + skills markdown | — |
| 3.3.2 | Update `docs/ARCHITECTURE.md` Layer B | 3.1 |
| 3.3.3 | Update `README.md` quick start + demo table | 3.2 |
| 3.3.4 | Manual run: both demos exit 0 in CI (no keys) | 3.2 |

**Exit:** `pnpm agent:demo` + `pnpm agent:bounty-hunt` + `pnpm run check`.
