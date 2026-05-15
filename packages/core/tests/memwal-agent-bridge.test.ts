import { describe, expect, it, vi } from "vitest";

import type { DurableMemoryStore } from "@memwalpp/memwal-client";
import { InMemoryLocalMemoryStore } from "@memwalpp/local-memory";

import {
  createMemWalAgentBridge,
  createMemorySyncService,
  extractRecallQuery,
} from "../src/index.js";

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

describe("MemWalAgentBridge", () => {
  it("beforeRemember injects local recall context", async () => {
    const local = new InMemoryLocalMemoryStore();
    const sync = createMemorySyncService({ local, durable: offlineDurable() });
    const bridge = createMemWalAgentBridge({
      sync,
      local,
      config: { defaultNamespace: "demo", recallLimit: 3 },
    });

    await local.remember({
      id: "m1",
      namespace: "demo",
      content: "Walrus proof is required for the bounty.",
      createdAtMs: 1,
      updatedAtMs: 1,
      synced: false,
    });

    const out = await bridge.beforeRemember(
      { namespace: "demo", agentId: "a1" },
      "How do we prove Walrus for the bounty?",
    );
    expect(out).toContain("Walrus proof");
    expect(extractRecallQuery("How do we prove Walrus?")).toBe("walrus");
    expect(extractRecallQuery("foo\n\n## Memory context\nbar")).toBe("memory");
  });
});
