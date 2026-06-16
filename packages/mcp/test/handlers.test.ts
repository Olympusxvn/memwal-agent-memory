import { describe, expect, it, vi } from "vitest";

import { createMemorySyncService } from "@memwalpp/core";
import type { DurableMemoryStore, DurableRememberResult } from "@memwalpp/memwal-client";
import { InMemoryLocalMemoryStore } from "@memwalpp/local-memory";
import type { MemoryRecord } from "@memwalpp/shared";

import {
  handleGetLineage,
  handleGetVersionHistory,
  handleRecall,
  handleRemember,
  handleSearch,
  handleVerify,
  type ToolRuntime,
} from "../src/tools/memory.js";
import { handleSync } from "../src/tools/sync.js";
import { createMockDurableMemoryStore } from "../src/runtime/mock-durable-store.js";

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

function liveDurable(handlers?: {
  remember?: (record: MemoryRecord) => Promise<DurableRememberResult>;
}): DurableMemoryStore {
  return {
    isLive: true,
    remember:
      handlers?.remember ??
      (async (record) => ({
        recordId: record.id,
        blobId: "blob-test-1",
        namespace: record.namespace,
      })),
    recall: vi.fn(),
    search: vi.fn(async () => []),
    delete: vi.fn(),
    listVersions: vi.fn(async () => [{ version: "1", source: "metadata" }]),
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

function offlineRuntime(qualityMin = 40): ToolRuntime {
  const local = new InMemoryLocalMemoryStore();
  const durable = offlineDurable();
  const sync = createMemorySyncService({ local, durable, config: { qualityMin } });
  return {
    sync,
    local,
    durable,
    config: { defaultNamespace: "default", qualityMin },
  };
}

function liveDurableRuntime(qualityMin = 0): ToolRuntime {
  const local = new InMemoryLocalMemoryStore();
  const durable = liveDurable();
  const sync = createMemorySyncService({ local, durable, config: { qualityMin } });
  return { sync, local, durable, config: { defaultNamespace: "default", qualityMin } };
}

describe("MCP memory handlers", () => {
  it("remember stores locally and returns proof", async () => {
    const rt = offlineRuntime();
    const out = await handleRemember(rt, { content: "Hello from MCP test memory." });
    expect(out.stored).toBe(true);
    expect(out.redactLocal).toBe(false);
    expect(typeof out.proof).toBe("string");
    const hits = await handleSearch(rt, { semantic_query: "MCP", limit: 5 });
    expect((hits.hits as unknown[]).length).toBeGreaterThan(0);
  });

  it("remember redactLocal true redacts before persist", async () => {
    const rt = offlineRuntime();
    const out = await handleRemember(rt, {
      content: "Email user@example.com with enough text for MCP local redact mode.",
      redactLocal: true,
    });
    expect(out.stored).toBe(true);
    expect(out.redactLocal).toBe(true);
    expect(out.redacted).toBe(true);
    const row = await rt.local.getById(out.recordId as string);
    expect(row?.content).not.toContain("user@example.com");
    expect(row?.metadata?.redactLocal).toBe("1");
  });

  it("remember redactLocal false keeps raw content locally", async () => {
    const rt = offlineRuntime();
    const email = "user@example.com";
    const out = await handleRemember(rt, {
      content: `Contact ${email} with enough text for default local storage mode.`,
      redactLocal: false,
    });
    const row = await rt.local.getById(out.recordId as string);
    expect(row?.content).toContain(email);
  });

  it("sync returns offline structured result when durable down", async () => {
    const rt = offlineRuntime();
    const out = await handleSync(rt, { forceDurable: false });
    expect(out.skipReason).toBe("offline");
  });

  it("sync runs redaction before durable write (S-1)", async () => {
    const remember = vi.fn(async (record: MemoryRecord) => ({
      recordId: record.id,
      blobId: "blob-test-1",
      namespace: record.namespace,
    }));
    const local = new InMemoryLocalMemoryStore();
    const durable = liveDurable({ remember });
    const sync = createMemorySyncService({ local, durable, config: { qualityMin: 0 } });
    const rt: ToolRuntime = {
      sync,
      local,
      durable,
      config: { defaultNamespace: "default", qualityMin: 0 },
    };
    await handleRemember(rt, {
      content: "Contact user@example.com with enough text for quality gate pass in sync.",
    });
    const rows = await local.recall({ namespace: "default", query: "", limit: 10 });
    const id = rows[0]!.id;
    const out = await handleSync(rt, { forceDurable: false });
    expect(out.metrics).toBeDefined();
    expect(remember).toHaveBeenCalledOnce();
    const pushed = remember.mock.calls[0]![0] as MemoryRecord;
    expect(pushed.content).not.toContain("user@example.com");
    expect(pushed.content).toContain("[redacted-email]");
    const verify = await handleVerify(rt, {
      proof: JSON.stringify({
        version: "1",
        memoryId: id,
        namespace: "default",
        contentHash: "invalid",
      }),
    });
    expect(verify.valid).toBe(false);
  });

  it("remember → sync → recall round-trip with mock durable", async () => {
    const local = new InMemoryLocalMemoryStore();
    const durable = createMockDurableMemoryStore("default");
    const sync = createMemorySyncService({ local, durable, config: { qualityMin: 0 } });
    const rt: ToolRuntime = {
      sync,
      local,
      durable,
      config: { defaultNamespace: "default", qualityMin: 0 },
    };
    const unique = `sync-roundtrip-${crypto.randomUUID()}`;
    await handleRemember(rt, {
      content: `${unique}: enough content for sync and recall after durable push.`,
    });
    const syncOut = await handleSync(rt, { forceDurable: false });
    expect((syncOut.metrics as { pushed: number }).pushed).toBeGreaterThanOrEqual(1);
    const recalled = await handleRecall(rt, { query: unique, options: { limit: 5 } });
    const hits = recalled.hits as Array<{ id?: string; content?: string; synced?: boolean }>;
    expect(hits.some((h) => h.content?.includes(unique))).toBe(true);
    expect(hits.some((h) => h.synced === true)).toBe(true);
  });

  it("search returns ranked hits with score and hitSource (1.1b)", async () => {
    const rt = offlineRuntime();
    await handleRemember(rt, { content: "Walrus hybrid memory for MCP search ranking test." });
    await handleRemember(rt, { content: "Completely unrelated weather forecast today." });
    const out = await handleSearch(rt, { semantic_query: "walrus hybrid", limit: 5 });
    const hits = out.hits as Array<{ score?: number; hitSource?: string; content?: string }>;
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.score).toBeGreaterThan(0);
    expect(hits[0]?.hitSource).toBe("local");
    expect(out.source).toBe("local");
    expect(out.verifiableCount).toBe(0);
  });

  it("getVersionHistory returns timeline after sync (1.1e)", async () => {
    const local = new InMemoryLocalMemoryStore();
    const durable = liveDurable();
    const sync = createMemorySyncService({ local, durable, config: { qualityMin: 0 } });
    const rt: ToolRuntime = {
      sync,
      local,
      durable,
      config: { defaultNamespace: "default", qualityMin: 0 },
    };

    const remembered = await handleRemember(rt, {
      content: "Version history MCP handler test with enough quality scoring text.",
    });
    const memoryId = remembered.recordId as string;

    let history = await handleGetVersionHistory(rt, { memoryId });
    expect(history.found).toBe(true);
    expect((history.versions as unknown[]).length).toBeGreaterThan(0);

    await handleSync(rt, {});
    history = await handleGetVersionHistory(rt, { memoryId, includeProof: true });
    expect(history.verifiable).toBe(true);
    expect(history.latestBlobId).toBeDefined();
    const versions = history.versions as Array<{ proof?: string; event?: string }>;
    expect(versions.some((v) => v.event === "promoted" || v.event === "created")).toBe(true);
  });

  it("search includeProof adds proof for verifiable hybrid hits", async () => {
    const local = new InMemoryLocalMemoryStore();
    const durable = liveDurable();
    const sync = createMemorySyncService({ local, durable, config: { qualityMin: 0 } });
    await sync.remember({
      id: "prov1",
      namespace: "default",
      content: "Verifiable walrus memory with enough quality text for gate pass here.",
      createdAtMs: 1,
      updatedAtMs: 1,
      synced: false,
    });
    await sync.pushOne("prov1");
    const rt: ToolRuntime = {
      sync,
      local,
      durable,
      config: { defaultNamespace: "default", qualityMin: 0 },
    };
    const out = await handleSearch(rt, {
      semantic_query: "verifiable walrus",
      includeProof: true,
      limit: 5,
    });
    const hits = out.hits as Array<{ verifiable?: boolean; proof?: string }>;
    expect(hits.some((h) => h.verifiable && typeof h.proof === "string")).toBe(true);
  });

  it("getLineage returns local graph after remember (1.1d)", async () => {
    const rt = offlineRuntime();
    const out = await handleRemember(rt, {
      content: "Lineage graph test memory with enough quality scoring text.",
    });
    const memoryId = out.recordId as string;
    const lineage = await handleGetLineage(rt, { memoryId, includeOnChain: false });
    expect(lineage.found).toBe(true);
    expect((lineage.local as { events?: unknown[] }).events?.length).toBeGreaterThan(0);
    expect((lineage.graph as { nodes?: unknown[] }).nodes?.length).toBeGreaterThan(0);
    expect((lineage.onChain as { checked?: boolean }).checked).toBe(false);
  });

  it("verify accepts valid proof for stored record", async () => {
    const rt = offlineRuntime();
    const out = await handleRemember(rt, { content: "Verifiable memory content for MCP." });
    const verify = await handleVerify(rt, { proof: out.proof as string });
    expect(verify.valid).toBe(true);
    expect((verify.local as { valid?: boolean }).valid).toBe(true);
    expect((verify.walrus as { checked?: boolean }).checked).toBe(true);
  });

  it("verify by memoryId checks walrus layer with mock durable (1.1c)", async () => {
    const local = new InMemoryLocalMemoryStore();
    const durable = createMockDurableMemoryStore("default");
    const sync = createMemorySyncService({ local, durable, config: { qualityMin: 0 } });
    const rt: ToolRuntime = {
      sync,
      local,
      durable,
      config: { defaultNamespace: "default", qualityMin: 0 },
    };
    const remembered = await handleRemember(rt, {
      content: "Walrus verify layered test with enough quality scoring text here.",
    });
    const memoryId = remembered.recordId as string;
    await handleSync(rt, {});
    const verify = await handleVerify(rt, { memoryId, checkOnChain: false });
    expect(verify.valid).toBe(true);
    expect((verify.walrus as { found?: boolean }).found).toBe(true);
    expect((verify.onChain as { checked?: boolean }).checked).toBe(false);
  });
});

describe("auth middleware", () => {
  it("rejects owner key env at startup", async () => {
    const { assertNoOwnerKeys } = await import("../src/middleware/auth.js");
    expect(() =>
      assertNoOwnerKeys({ MEMWAL_OWNER_KEY: "0xdeadbeef" } as NodeJS.ProcessEnv),
    ).toThrow(/owner keys/i);
  });
});
