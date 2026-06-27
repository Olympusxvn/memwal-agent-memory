#!/usr/bin/env tsx
/**
 * Hybrid recall micro-benchmark (Phase 15 / Gap H).
 * Outputs JSON for docs/benchmarks/hybrid-memory.md refresh.
 */
import { performance } from "node:perf_hooks";

import { InMemoryLocalMemoryStore, SqliteLocalStore } from "@memwalpp/local-memory";
import type { LocalMemoryStore } from "@memwalpp/local-memory";

const ITERATIONS = Number.parseInt(process.env.BENCH_ITERATIONS ?? "200", 10);
const ROWS = Number.parseInt(process.env.BENCH_ROWS ?? "500", 10);
const NAMESPACE = "bench-recall";

function percentile(sorted: number[], p: number): number {
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx]!;
}

async function seedStore(store: LocalMemoryStore): Promise<void> {
  const now = Date.now();
  for (let i = 0; i < ROWS; i++) {
    await store.remember({
      id: `bench-${i}`,
      namespace: NAMESPACE,
      content: `Bench row ${i}: hybrid memory recall latency Walrus track token ${i % 17}`,
      createdAtMs: now - i,
      updatedAtMs: now - i,
      synced: i % 3 === 0,
    });
  }
}

async function benchStore(label: string, store: LocalMemoryStore) {
  await seedStore(store);
  const substringMs: number[] = [];
  const ftsMs: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const t0 = performance.now();
    await store.recall({
      namespace: NAMESPACE,
      query: "hybrid memory",
      limit: 10,
      searchMode: "substring",
    });
    substringMs.push(performance.now() - t0);

    const t1 = performance.now();
    await store.recall({
      namespace: NAMESPACE,
      query: "hybrid Walrus",
      limit: 10,
      searchMode: "fts",
    });
    ftsMs.push(performance.now() - t1);
  }
  substringMs.sort((a, b) => a - b);
  ftsMs.sort((a, b) => a - b);
  return {
    store: label,
    rows: ROWS,
    iterations: ITERATIONS,
    substringP50Ms: Number(percentile(substringMs, 50).toFixed(3)),
    substringP95Ms: Number(percentile(substringMs, 95).toFixed(3)),
    ftsP50Ms: Number(percentile(ftsMs, 50).toFixed(3)),
    ftsP95Ms: Number(percentile(ftsMs, 95).toFixed(3)),
  };
}

async function main(): Promise<void> {
  const results = [
    await benchStore("in-memory", new InMemoryLocalMemoryStore()),
    await benchStore("sqlite", new SqliteLocalStore(":memory:")),
  ];

  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        env: { iterations: ITERATIONS, rows: ROWS },
        results,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
