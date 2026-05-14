import { createRequire } from "node:module";
import type { MemoryRecord } from "@memwalpp/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  InMemoryLocalMemoryStore,
  LOCAL_MEMORY_RECALL_MAX,
  LocalMemoryStore,
  SqliteLocalStore,
} from "../src/index.js";

const require = createRequire(import.meta.url);

function sqliteNativeAvailable(): boolean {
  try {
    const SqliteDatabase: typeof import("better-sqlite3").default = require("better-sqlite3");
    const d = new SqliteDatabase(":memory:");
    d.exec("SELECT 1");
    d.close();
    return true;
  } catch {
    return false;
  }
}

function baseRecord(over: Partial<MemoryRecord> = {}): MemoryRecord {
  const now = Date.now();
  return {
    id: "m1",
    namespace: "ns-demo",
    content: "hello world",
    createdAtMs: now,
    updatedAtMs: now,
    synced: false,
    ...over,
  };
}

const backends: { name: string; create: () => LocalMemoryStore; teardown: (s: LocalMemoryStore) => void }[] = [
  {
    name: "InMemoryLocalMemoryStore",
    create: () => new InMemoryLocalMemoryStore(),
    teardown: () => {},
  },
  ...(sqliteNativeAvailable()
    ? [
        {
          name: "SqliteLocalStore(:memory:)",
          create: () => new SqliteLocalStore(":memory:"),
          teardown: (s: LocalMemoryStore) => {
            if (s instanceof SqliteLocalStore) s.close();
          },
        },
      ]
    : []),
];

describe.each(backends)("$name — contract", ({ create, teardown }) => {
  let store: LocalMemoryStore;

  beforeEach(() => {
    store = create();
  });

  afterEach(() => {
    teardown(store);
  });

  it("remember + getById roundtrip", async () => {
    const r = baseRecord({ id: "a1", content: "alpha" });
    await store.remember(r);
    const got = await store.getById("a1");
    expect(got?.content).toBe("alpha");
    expect(got?.namespace).toBe("ns-demo");
  });

  it("remember upserts same id", async () => {
    const t0 = Date.now();
    await store.remember(baseRecord({ id: "u1", content: "v1", updatedAtMs: t0 }));
    await store.remember(baseRecord({ id: "u1", content: "v2", updatedAtMs: t0 + 1 }));
    const got = await store.getById("u1");
    expect(got?.content).toBe("v2");
  });

  it("rejects empty id", async () => {
    await expect(store.remember(baseRecord({ id: "  " }))).rejects.toMatchObject({
      code: "VALIDATION",
    });
  });

  it("rejects empty namespace", async () => {
    await expect(store.remember(baseRecord({ id: "x", namespace: "" }))).rejects.toMatchObject({
      code: "VALIDATION",
    });
  });

  it("getById empty string returns undefined", async () => {
    expect(await store.getById("")).toBeUndefined();
  });

  it("recall empty query returns all in namespace (newest first)", async () => {
    await store.remember(baseRecord({ id: "r1", content: "a", updatedAtMs: 100 }));
    await store.remember(baseRecord({ id: "r2", content: "b", updatedAtMs: 200 }));
    const rows = await store.recall({ namespace: "ns-demo", query: "", limit: 10 });
    expect(rows.map((x) => x.id)).toEqual(["r2", "r1"]);
  });

  it("recall substring match is case-insensitive", async () => {
    await store.remember(baseRecord({ id: "c1", content: "Hello BANANA" }));
    const rows = await store.recall({ namespace: "ns-demo", query: "banana", limit: 10 });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("c1");
  });

  it("recall clamps limit to LOCAL_MEMORY_RECALL_MAX", async () => {
    for (let i = 0; i < 5; i++) {
      await store.remember(
        baseRecord({ id: `bulk-${i}`, content: `x${i}`, updatedAtMs: 300 + i }),
      );
    }
    const rows = await store.recall({
      namespace: "ns-demo",
      query: "x",
      limit: LOCAL_MEMORY_RECALL_MAX + 999,
    });
    expect(rows.length).toBeLessThanOrEqual(LOCAL_MEMORY_RECALL_MAX);
  });

  it("recall returns newest rows when limited", async () => {
    await store.remember(baseRecord({ id: "n1", updatedAtMs: 10 }));
    await store.remember(baseRecord({ id: "n2", updatedAtMs: 30 }));
    await store.remember(baseRecord({ id: "n3", updatedAtMs: 20 }));
    const rows = await store.recall({ namespace: "ns-demo", query: "", limit: 2 });
    expect(rows.map((r) => r.id)).toEqual(["n2", "n3"]);
  });

  it("rejects empty namespace on recall", async () => {
    await expect(store.recall({ namespace: "  ", query: "", limit: 5 })).rejects.toMatchObject({
      code: "VALIDATION",
    });
  });

  it("prune olderThanMs with optional namespace", async () => {
    await store.remember(baseRecord({ id: "o1", namespace: "n1", updatedAtMs: 10 }));
    await store.remember(baseRecord({ id: "o2", namespace: "n2", updatedAtMs: 20 }));
    const deleted = await store.prune({ olderThanMs: 15, namespace: "n1" });
    expect(deleted).toBe(1);
    expect(await store.getById("o1")).toBeUndefined();
    expect(await store.getById("o2")).toBeDefined();
  });

  it("prune keepLatest per namespace", async () => {
    await store.remember(baseRecord({ id: "k1", namespace: "z", updatedAtMs: 1 }));
    await store.remember(baseRecord({ id: "k2", namespace: "z", updatedAtMs: 2 }));
    await store.remember(baseRecord({ id: "k3", namespace: "z", updatedAtMs: 3 }));
    const deleted = await store.prune({ keepLatest: 1, namespace: "z" });
    expect(deleted).toBe(2);
    const left = await store.recall({ namespace: "z", query: "", limit: 10 });
    expect(left).toHaveLength(1);
    expect(left[0].id).toBe("k3");
  });

  it("sequential parallel remembers complete", async () => {
    const batch = Array.from({ length: 25 }, (_, i) =>
      store.remember(
        baseRecord({
          id: `p-${i}`,
          content: `c${i}`,
          updatedAtMs: 1000 + i,
        }),
      ),
    );
    await Promise.all(batch);
    const rows = await store.recall({ namespace: "ns-demo", query: "c", limit: 50 });
    expect(rows.length).toBe(25);
  });

  it("stores large content", async () => {
    const big = "x".repeat(120_000);
    await store.remember(baseRecord({ id: "big1", content: big }));
    const got = await store.getById("big1");
    expect(got?.content.length).toBe(120_000);
  });
});
