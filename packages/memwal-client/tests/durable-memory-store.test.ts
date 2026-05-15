import type { MemoryRecord } from "@memwalpp/shared";
import { describe, expect, it, vi } from "vitest";

import {
  applyRememberResult,
  createDurableMemoryStore,
} from "../src/durable/durable-memory-store.js";
import { MemWalConfigError } from "../src/errors.js";
import type { MemWalService } from "../src/service.js";

function mockService(overrides: Partial<MemWalService> = {}): MemWalService {
  return {
    isLive: true,
    remember: vi.fn().mockResolvedValue({ jobId: "job-1", blobId: "0x" + "a".repeat(64) }),
    recall: vi.fn().mockResolvedValue([{ text: "hit-one", blobId: "0x" + "b".repeat(64), distance: 0.1 }]),
    health: vi.fn().mockResolvedValue({ ok: true, version: "1.0" }),
    destroy: vi.fn(),
    ...overrides,
  };
}

function sampleRecord(): MemoryRecord {
  const now = Date.now();
  return {
    id: "rec-1",
    namespace: "ns1",
    content: "hello durable",
    createdAtMs: now,
    updatedAtMs: now,
    synced: false,
  };
}

describe("DurableMemoryStore", () => {
  it("offline store rejects remember", async () => {
    const offlineSvc: MemWalService = {
      isLive: false,
      remember: vi.fn(),
      recall: vi.fn(),
      health: vi.fn(),
      destroy: vi.fn(),
    };
    const store = createDurableMemoryStore(offlineSvc);
    await expect(store.remember(sampleRecord())).rejects.toBeInstanceOf(MemWalConfigError);
  });

  it("remember maps job and blob ids", async () => {
    const svc = mockService();
    const store = createDurableMemoryStore(svc);
    const result = await store.remember(sampleRecord());
    expect(result.recordId).toBe("rec-1");
    expect(result.jobId).toBe("job-1");
    expect(result.blobId).toBeDefined();
    expect(svc.remember).toHaveBeenCalledOnce();
  });

  it("search returns recall hits", async () => {
    const svc = mockService();
    const store = createDurableMemoryStore(svc);
    const hits = await store.search("query", { namespace: "ns1", limit: 5 });
    expect(hits).toHaveLength(1);
    expect(hits[0].text).toBe("hit-one");
    expect(svc.recall).toHaveBeenCalledWith("query", 5, "ns1");
  });

  it("delete tombstones record id", async () => {
    const store = createDurableMemoryStore(mockService());
    await store.delete("rec-1", { namespace: "ns1" });
    const versions = await store.listVersions("rec-1", { namespace: "ns1" });
    expect(versions).toHaveLength(0);
  });

  it("applyRememberResult sets synced and blob", () => {
    const updated = applyRememberResult(sampleRecord(), {
      recordId: "rec-1",
      jobId: "job-1",
      blobId: "0x" + "c".repeat(64),
      namespace: "ns1",
    });
    expect(updated.synced).toBe(true);
    expect(updated.walrusBlobId).toBeDefined();
    expect(updated.metadata?.lastJobId).toBe("job-1");
  });
});
