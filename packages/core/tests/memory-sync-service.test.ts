import { describe, expect, it, vi } from "vitest";

import type { DurableMemoryStore, DurableRecallHit, DurableRememberResult } from "@memwalpp/memwal-client";
import { InMemoryLocalMemoryStore } from "@memwalpp/local-memory";
import type { MemoryRecord } from "@memwalpp/shared";

import { createMemorySyncService } from "../src/memory/memory-sync-service.js";

function offlineDurable(): DurableMemoryStore {
  return {
    isLive: false,
    remember: vi.fn(),
    recall: vi.fn(),
    search: vi.fn(),
    delete: vi.fn(),
    listVersions: vi.fn(),
    health: vi.fn(async () => ({ ok: false })),
    destroy: vi.fn(),
  };
}

function liveDurable(handlers: {
  remember?: (record: MemoryRecord) => Promise<DurableRememberResult>;
  search?: (query: string) => Promise<DurableRecallHit[]>;
}): DurableMemoryStore {
  return {
    isLive: true,
    remember:
      handlers.remember ??
      (async (record) => ({
        recordId: record.id,
        blobId: "blob-test-1",
        namespace: record.namespace,
      })),
    recall: vi.fn(),
    search: handlers.search ?? vi.fn(async () => []),
    delete: vi.fn(),
    listVersions: vi.fn(async () => []),
    health: vi.fn(async () => ({ ok: true })),
    destroy: vi.fn(),
  };
}

describe("MemorySyncService", () => {
  it("pushOne redacts email before durable remember", async () => {
    const local = new InMemoryLocalMemoryStore();
    const remember = vi.fn(async (record: MemoryRecord) => ({
      recordId: record.id,
      blobId: "0xabc",
      namespace: record.namespace,
    }));
    const durable = liveDurable({ remember });

    await local.remember({
      id: "r1",
      namespace: "default",
      content: "Contact me at user@example.com for details",
      createdAtMs: 1,
      updatedAtMs: 1,
      synced: false,
    });

    const sync = createMemorySyncService({ local, durable, config: { qualityMin: 0 } });
    const result = await sync.pushOne("r1");

    expect(result.pushed).toBe(true);
    expect(remember).toHaveBeenCalledOnce();
    const pushed = remember.mock.calls[0]![0] as MemoryRecord;
    expect(pushed.content).not.toContain("user@example.com");
    expect(pushed.content).toContain("[redacted-email]");

    const stored = await local.getById("r1");
    expect(stored?.synced).toBe(true);
    expect(stored?.content).toContain("[redacted-email]");
  });

  it("pushOne blocks low quality", async () => {
    const local = new InMemoryLocalMemoryStore();
    const durable = liveDurable({});
    await local.remember({
      id: "r2",
      namespace: "default",
      content: "x",
      createdAtMs: 1,
      updatedAtMs: 1,
      synced: false,
    });

    const sync = createMemorySyncService({ local, durable, config: { qualityMin: 99 } });
    const result = await sync.pushOne("r2");
    expect(result.pushed).toBe(false);
    expect(result.reason).toBe("gate");
  });

  it("pullQuery hydrates durable hits with durable_wins", async () => {
    const local = new InMemoryLocalMemoryStore();
    await local.remember({
      id: "r3",
      namespace: "default",
      content: "local only",
      createdAtMs: 1,
      updatedAtMs: 1,
      synced: true,
    });

    const durable = liveDurable({
      search: async () => [
        {
          text: "from durable layer",
          blobId: "blob-99",
          metadata: { recordId: "r3" },
        },
      ],
    });

    const sync = createMemorySyncService({
      local,
      durable,
      config: { conflictStrategy: "durable_wins" },
    });

    const rows = await sync.pullQuery("durable", { forceDurable: true });
    const row = rows.find((r) => r.id === "r3");
    expect(row?.content).toBe("from durable layer");
    expect(row?.synced).toBe(true);
  });

  it("pullQuery local_wins keeps unsynced local edits", async () => {
    const local = new InMemoryLocalMemoryStore();
    await local.remember({
      id: "r6",
      namespace: "default",
      content: "local edit pending durable",
      createdAtMs: 1,
      updatedAtMs: 1,
      synced: false,
    });

    const durable = liveDurable({
      search: async () => [
        { text: "stale durable text", blobId: "blob-r6", metadata: { recordId: "r6" } },
      ],
    });

    const sync = createMemorySyncService({
      local,
      durable,
      config: { conflictStrategy: "local_wins" },
    });

    const rows = await sync.pullQuery("durable", { forceDurable: true });
    const row = rows.find((r) => r.id === "r6");
    expect(row?.content).toBe("local edit pending durable");
  });

  it("pullQuery reconciles durable hits to local rows by walrusBlobId (no duplicates)", async () => {
    const local = new InMemoryLocalMemoryStore();
    await local.remember({
      id: "r7",
      namespace: "default",
      content: "original local",
      createdAtMs: 1,
      updatedAtMs: 1,
      synced: true,
      walrusBlobId: "blob-xyz" as MemoryRecord["walrusBlobId"],
    });

    const durable = liveDurable({
      // Relayer recall returns no metadata → only blobId is available to reconcile.
      search: async () => [{ text: "durable copy", blobId: "blob-xyz" }],
    });

    const sync = createMemorySyncService({
      local,
      durable,
      config: { conflictStrategy: "durable_wins" },
    });

    const rows = await sync.pullQuery("durable", { forceDurable: true });
    const ids = new Set(rows.map((r) => r.id));
    expect(ids.has("r7")).toBe(true);
    expect([...ids].some((id) => id.startsWith("dur-"))).toBe(false);
  });

  it("syncPending pushes unsynced rows", async () => {
    const local = new InMemoryLocalMemoryStore();
    const durable = liveDurable({});
    await local.remember({
      id: "r4",
      namespace: "default",
      content: "Enough content here for quality scoring in tests.",
      createdAtMs: 1,
      updatedAtMs: 1,
      synced: false,
    });

    const sync = createMemorySyncService({ local, durable, config: { qualityMin: 0 } });
    const metrics = await sync.syncPending();
    expect(metrics.pushed).toBe(1);
    expect((await local.getById("r4"))?.synced).toBe(true);
  });

  it("pushOne returns offline when durable not live", async () => {
    const local = new InMemoryLocalMemoryStore();
    await local.remember({
      id: "r5",
      namespace: "default",
      content: "Some reasonable memory text for sync.",
      createdAtMs: 1,
      updatedAtMs: 1,
      synced: false,
    });
    const sync = createMemorySyncService({ local, durable: offlineDurable() });
    const result = await sync.pushOne("r5");
    expect(result.pushed).toBe(false);
    expect(result.reason).toBe("offline");
  });
});
