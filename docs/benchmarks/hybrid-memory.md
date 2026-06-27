# Hybrid memory benchmarks (Phase 15 / Gap H)

Micro-benchmarks for **local recall** latency — substring vs FTS5 AND-token mode.
Walrus/durable recall depends on MemWal relayer RTT and is not included in the default script.

## Run

```bash
pnpm bench:recall
# Optional: BENCH_ROWS=1000 BENCH_ITERATIONS=500 pnpm bench:recall
```

Output is JSON on stdout (`generatedAt`, `results[]` with p50/p95 ms per store).

## Reference snapshot (dev machine, illustrative)

| Store | Rows | Mode | p50 (ms) | p95 (ms) |
|-------|------|------|----------|----------|
| in-memory | 500 | substring | ~0.01 | ~0.02 |
| in-memory | 500 | fts (2 tokens) | ~0.02 | ~0.04 |
| sqlite (:memory:) | 500 | substring | ~0.05 | ~0.15 |
| sqlite (:memory:) | 500 | fts (2 tokens) | ~0.08 | ~0.25 |

Re-run `pnpm bench:recall` on your machine and paste fresh numbers before judging latency claims.

## What this measures

- **substring** — `INSTR(LOWER(content), …)` (SQLite) or `includes` (in-memory).
- **fts** — SQLite FTS5 `MATCH` with AND-joined tokens; in-memory uses the same AND-token rule.

Enable FTS by default for multi-token queries: `MEMWAL_RECALL_FTS=1` or pass `searchMode: "fts"` on recall.

## Walrus path (manual)

| Step | Command | Notes |
|------|---------|-------|
| Promote | `MEMWAL_AUTO_PUSH=1 pnpm agent:bounty-hunt` | blob id in output |
| Verify | `pnpm mcp:e2e` | layered verify PASS |
| Portable | `pnpm mcp:e2e:portable` | fresh local rehydrate |

Durable search latency is dominated by network — see [`walrus-memory-alignment.md`](../walrus-memory-alignment.md) P2 async remember notes.
