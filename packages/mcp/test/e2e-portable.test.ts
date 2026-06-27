/**
 * Portable memory E2E — fresh local store rehydrates from shared mock durable (Phase 12 / Gap E).
 */
import { describe, expect, it } from "vitest";

import { createMemorySyncService } from "@memwalpp/core";
import { InMemoryLocalMemoryStore } from "@memwalpp/local-memory";

import { handleRemember, handleVerify } from "../src/tools/memory.js";
import { handleSync } from "../src/tools/sync.js";
import { createMockDurableMemoryStore } from "../src/runtime/mock-durable-store.js";
import type { ToolRuntime } from "../src/tools/memory.js";

const namespace = "portable-e2e";

function createRuntime(local: InMemoryLocalMemoryStore, durable: ReturnType<typeof createMockDurableMemoryStore>): ToolRuntime {
  const sync = createMemorySyncService({
    local,
    durable,
    config: { defaultNamespace: namespace, qualityMin: 0, uploadThreshold: 0 },
  });
  return {
    sync,
    local,
    durable,
    config: { defaultNamespace: namespace },
  };
}

describe("portable memory (Gap E)", () => {
  it("rehydrates from durable into a fresh local store and verify passes", async () => {
    const durable = createMockDurableMemoryStore(namespace);
    const localA = new InMemoryLocalMemoryStore();
    const rtA = createRuntime(localA, durable);

    const unique = `portable-${crypto.randomUUID()}`;
    const remembered = await handleRemember(rtA, {
      content: `${unique}: portable memory proof across fresh local SQLite stores with enough text.`,
      metadata: { source: "portable-e2e" },
      promote: "walrus",
    });
    expect(remembered.stored).toBe(true);

    const synced = await handleSync(rtA, {});
    expect(synced.durableLive).toBe(true);
    const metrics = synced.metrics as { pushed?: number };
    expect(Number(metrics.pushed)).toBeGreaterThanOrEqual(1);

    const localB = new InMemoryLocalMemoryStore();
    const rtB = createRuntime(localB, durable);
    const hits = await rtB.sync.pullQuery(unique, {
      namespace,
      limit: 5,
      forceDurable: true,
    });
    expect(hits.some((h) => h.content.includes(unique))).toBe(true);
    expect(hits[0]?.synced).toBe(true);
    expect(typeof hits[0]?.walrusBlobId).toBe("string");

    const verified = await handleVerify(rtB, {
      proof: remembered.proof as string,
      memoryId: remembered.recordId as string,
    });
    expect(verified.valid).toBe(true);
  });
});
