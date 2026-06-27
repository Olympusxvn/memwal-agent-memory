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
    verifyBlob: vi.fn(async () => ({
      checked: false,
      live: false,
      found: false,
      reasons: ["durable_offline"],
    })),
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
    verifyBlob: vi.fn(async (blobId: string) => ({
      checked: true,
      live: true,
      found: blobId === "blob-test-1",
      blobId,
      reasons: blobId === "blob-test-1" ? [] : ["blob_not_found_in_durable"],
    })),
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

    const sync = createMemorySyncService({ local, durable, config: { qualityMin: 0, uploadThreshold: 0 } });
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

  it("remember with redactLocal stores redacted content locally", async () => {
    const local = new InMemoryLocalMemoryStore();
    const sync = createMemorySyncService({ local, durable: offlineDurable(), config: { qualityMin: 0, uploadThreshold: 0 } });
    const saved = await sync.remember(
      {
        id: "r-local",
        namespace: "default",
        content: "Reach user@example.com for enough quality scoring text here.",
        createdAtMs: 1,
        updatedAtMs: 1,
        synced: false,
      },
      { redactLocal: true },
    );
    expect(saved.content).not.toContain("user@example.com");
    expect(saved.metadata?.redactLocal).toBe("1");
  });

  it("remember without redactLocal keeps raw content until pushOne", async () => {
    const local = new InMemoryLocalMemoryStore();
    const sync = createMemorySyncService({ local, durable: offlineDurable(), config: { qualityMin: 0, uploadThreshold: 0 } });
    const saved = await sync.remember(
      {
        id: "r-raw",
        namespace: "default",
        content: "Reach user@example.com for enough quality scoring text here.",
        createdAtMs: 1,
        updatedAtMs: 1,
        synced: false,
      },
    );
    expect(saved.content).toContain("user@example.com");
    expect(saved.metadata?.redactLocal).toBeUndefined();
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

  it("searchQuery ranks local memories by semantic score", async () => {
    const local = new InMemoryLocalMemoryStore();
    await local.remember({
      id: "s1",
      namespace: "default",
      content: "Walrus hybrid memory architecture notes",
      createdAtMs: 1,
      updatedAtMs: 1,
      synced: false,
    });
    await local.remember({
      id: "s2",
      namespace: "default",
      content: "Unrelated cooking recipe for pasta",
      createdAtMs: 2,
      updatedAtMs: 2,
      synced: false,
    });

    const sync = createMemorySyncService({ local, durable: offlineDurable(), config: { qualityMin: 0, uploadThreshold: 0 } });
    const hits = await sync.searchQuery("walrus hybrid", { limit: 5 });
    expect(hits.length).toBe(1);
    expect(hits[0]?.record.id).toBe("s1");
    expect(hits[0]?.score).toBeGreaterThan(0);
    expect(hits[0]?.source).toBe("local");
    expect(hits[0]?.verifiable).toBe(false);
  });

  it("searchQuery hydrates durable hits and marks verifiable synced rows", async () => {
    const local = new InMemoryLocalMemoryStore();
    await local.remember({
      id: "v1",
      namespace: "default",
      content: "local copy pending",
      createdAtMs: 1,
      updatedAtMs: 1,
      synced: true,
      walrusBlobId: "blob-v1" as MemoryRecord["walrusBlobId"],
    });

    const durable = liveDurable({
      search: async () => [
        {
          text: "verifiable walrus hybrid memory",
          blobId: "blob-v1",
          distance: 0.1,
          metadata: { recordId: "v1" },
        },
      ],
    });

    const sync = createMemorySyncService({
      local,
      durable,
      config: { conflictStrategy: "durable_wins" },
    });

    const hits = await sync.searchQuery("walrus verifiable", { forceDurable: true, limit: 5 });
    const hit = hits.find((h) => h.record.id === "v1");
    expect(hit).toBeDefined();
    expect(hit?.source).toBe("hybrid");
    expect(hit?.verifiable).toBe(true);
    expect(hit?.score).toBeGreaterThan(0);
  });

  it("searchQuery skips tombstones", async () => {
    const local = new InMemoryLocalMemoryStore();
    await local.remember({
      id: "dead",
      namespace: "default",
      content: "walrus deleted memory",
      createdAtMs: 1,
      updatedAtMs: 1,
      synced: false,
      metadata: { deleted: "1" },
    });

    const sync = createMemorySyncService({ local, durable: offlineDurable() });
    const hits = await sync.searchQuery("walrus", { limit: 5 });
    expect(hits.some((h) => h.record.id === "dead")).toBe(false);
  });

  it("getVersionHistory returns created + promoted timeline (1.1e)", async () => {
    const local = new InMemoryLocalMemoryStore();
    const durable = liveDurable({});
    const sync = createMemorySyncService({ local, durable, config: { qualityMin: 0, uploadThreshold: 0 } });

    await sync.remember({
      id: "vh1",
      namespace: "default",
      content: "Version history test content with enough quality scoring text.",
      createdAtMs: 1,
      updatedAtMs: 1,
      synced: false,
    });

    let history = await sync.getVersionHistory("vh1");
    expect(history.found).toBe(true);
    expect(history.versions.some((v) => v.event === "created")).toBe(true);
    expect(history.currentVersion).toBe("1");

    await sync.pushOne("vh1");
    history = await sync.getVersionHistory("vh1");
    expect(history.verifiable).toBe(true);
    expect(history.latestBlobId).toBeDefined();
    expect(history.versions.some((v) => v.event === "promoted" || v.source === "durable")).toBe(
      true,
    );

    await sync.remember({
      id: "vh1",
      namespace: "default",
      content: "Edited version history test content with enough quality scoring text.",
      createdAtMs: 1,
      updatedAtMs: 2,
      synced: true,
      walrusBlobId: history.latestBlobId as MemoryRecord["walrusBlobId"],
      metadata: (await local.getById("vh1"))?.metadata,
    });

    history = await sync.getVersionHistory("vh1");
    expect(history.versions.some((v) => v.event === "edited")).toBe(true);
    expect(Number.parseInt(history.currentVersion ?? "0", 10)).toBeGreaterThanOrEqual(2);
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

    const sync = createMemorySyncService({ local, durable, config: { qualityMin: 0, uploadThreshold: 0 } });
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
