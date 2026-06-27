import { describe, expect, it, vi } from "vitest";

import { createMemorySyncService } from "@memwalpp/core";
import type { DurableMemoryStore } from "@memwalpp/memwal-client";
import { InMemoryLocalMemoryStore } from "@memwalpp/local-memory";

import {
  handleBuyMemoryPack,
  handleCreateBounty,
  handleForkMemory,
  type ChainToolRuntime,
} from "../src/tools/chain-handlers.js";

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

function chainRuntime(): ChainToolRuntime {
  const local = new InMemoryLocalMemoryStore();
  const durable = offlineDurable();
  const sync = createMemorySyncService({ local, durable, config: { qualityMin: 0, uploadThreshold: 0 } });
  return {
    sync,
    local,
    durable,
    config: { defaultNamespace: "default", qualityMin: 0, uploadThreshold: 0 },
    chain: null,
  };
}

describe("MCP chain handlers (no chain env)", () => {
  it("createBounty returns chain_not_configured", async () => {
    const out = await handleCreateBounty(chainRuntime(), {
      description: "Test bounty for chain handler unit test.",
    });
    expect(out.skipReason).toBe("chain_not_configured");
  });

  it("buyMemoryPack returns chain_not_configured", async () => {
    const out = await handleBuyMemoryPack(chainRuntime(), {
      packId: "0x1",
      priceMist: "1000",
    });
    expect(out.skipReason).toBe("chain_not_configured");
  });

  it("forkMemory returns chain_not_configured", async () => {
    const out = await handleForkMemory(chainRuntime(), {
      parentPackObjectId: "0x1",
      recordId: "rec-1",
    });
    expect(out.skipReason).toBe("chain_not_configured");
  });
});
