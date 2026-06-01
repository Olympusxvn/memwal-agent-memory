import { describe, expect, it, vi } from "vitest";

import { createMemorySyncService } from "@memwalpp/core";
import type { DurableMemoryStore, DurableRememberResult } from "@memwalpp/memwal-client";
import { InMemoryLocalMemoryStore } from "@memwalpp/local-memory";
import type { MemoryRecord } from "@memwalpp/shared";

import {
  handlePromote,
  handleRemember,
  handleSearch,
  handleSync,
  type ToolRuntime,
} from "../src/tools/handlers.js";

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
    listVersions: vi.fn(async () => []),
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
  it("remember stores locally without promote", async () => {
    const rt = offlineRuntime();
    const out = await handleRemember(rt, { content: "Hello from MCP test memory." });
    expect(out.stored).toBe(true);
    expect(out.promoted).toBeUndefined();
    const hits = await handleSearch(rt, { query: "MCP", limit: 5 });
    expect((hits.hits as unknown[]).length).toBeGreaterThan(0);
  });

  it("promote returns offline when durable unavailable", async () => {
    const rt = offlineRuntime(0);
    const stored = await handleRemember(rt, {
      content: "Enough content here for quality scoring in MCP tests.",
    });
    const id = stored.recordId as string;
    const out = await handlePromote(rt, { recordId: id });
    expect(out.promoted).toBe(false);
    expect(out.skipReason).toBe("offline");
  });

  it("promote runs gate — low quality returns skipReason gate", async () => {
    const rt = liveDurableRuntime(99);
    const stored = await handleRemember(rt, { content: "short" });
    const out = await handlePromote(rt, { recordId: stored.recordId as string });
    expect(out.promoted).toBe(false);
    expect(out.skipReason).toBe("gate");
  });

  it("sync returns offline structured result when durable down", async () => {
    const rt = offlineRuntime();
    const out = await handleSync(rt, { mode: "pending" });
    expect(out.skipReason).toBe("offline");
  });

  it("promote path runs redaction before durable write (S-1)", async () => {
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
    const stored = await handleRemember(rt, {
      content: "Contact user@example.com with enough text for quality gate pass.",
      promote: true,
    });
    expect(stored.promoted).toBe(true);
    expect(remember).toHaveBeenCalledOnce();
    const pushed = remember.mock.calls[0]![0] as MemoryRecord;
    expect(pushed.content).not.toContain("user@example.com");
    expect(pushed.content).toContain("[redacted-email]");
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
