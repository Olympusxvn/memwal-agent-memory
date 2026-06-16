import { describe, expect, it } from "vitest";

import { InMemoryLocalMemoryStore } from "@memwalpp/local-memory";
import type { ChainReader } from "@memwalpp/memwal-client";
import { MEMORY_METADATA_KEYS } from "@memwalpp/shared";

import { proofFromRecord, verifyLocalProof, verifyMemoryLayers } from "../src/memory/verify-memory.js";

function offlineDurable(overrides?: {
  verifyBlob?: (blobId: string) => Promise<{
    checked: boolean;
    live: boolean;
    found: boolean;
    reasons: string[];
  }>;
}) {
  return {
    isLive: false,
    verifyBlob:
      overrides?.verifyBlob ??
      (async () => ({
        checked: false,
        live: false,
        found: false,
        reasons: ["durable_offline"],
      })),
  };
}

describe("verifyMemoryLayers (1.1c)", () => {
  it("verifyLocalProof rejects hash mismatch", async () => {
    const local = new InMemoryLocalMemoryStore();
    await local.remember({
      id: "m1",
      namespace: "default",
      content: "hello",
      createdAtMs: 1,
      updatedAtMs: 1,
      synced: false,
    });
    const row = await local.getById("m1");
    const proof = proofFromRecord(row!);
    proof.contentHash = "deadbeef";
    const localResult = verifyLocalProof(proof, row!);
    expect(localResult.valid).toBe(false);
    expect(localResult.reasons).toContain("content_hash_mismatch");
  });

  it("layers local + walrus + onChain with mock chain reader", async () => {
    const local = new InMemoryLocalMemoryStore();
    await local.remember({
      id: "m2",
      namespace: "default",
      content: "On-chain verify test memory",
      createdAtMs: 1,
      updatedAtMs: 1,
      synced: true,
      walrusBlobId: "blob-abc",
      metadata: {
        [MEMORY_METADATA_KEYS.packId]: "0xpack1",
        [MEMORY_METADATA_KEYS.bountyId]: "0xbounty1",
      },
    });

    const chainReader: ChainReader = {
      isLive: true,
      network: "mainnet",
      verifyMemoryRefs: async () => ({
        checked: true,
        live: true,
        network: "mainnet",
        packContainsBlob: true,
        bountyReferencesBlob: true,
        reasons: [],
        refs: { packId: "0xpack1", bountyId: "0xbounty1" },
      }),
    };

    const result = await verifyMemoryLayers({
      local,
      durable: offlineDurable({
        verifyBlob: async (blobId) => ({
          checked: true,
          live: true,
          found: blobId === "blob-abc",
          reasons: [],
        }),
      }) as never,
      chainReader,
      input: { memoryId: "m2" },
    });

    expect(result.valid).toBe(true);
    if ("local" in result) {
      expect(result.local.valid).toBe(true);
      expect(result.walrus.found).toBe(true);
      expect(result.onChain.packContainsBlob).toBe(true);
    }
  });

  it("onChain fails when refs present but chain reader offline", async () => {
    const local = new InMemoryLocalMemoryStore();
    await local.remember({
      id: "m3",
      namespace: "default",
      content: "pack ref only",
      createdAtMs: 1,
      updatedAtMs: 1,
      synced: false,
      metadata: { [MEMORY_METADATA_KEYS.packId]: "0xpack1" },
    });

    const result = await verifyMemoryLayers({
      local,
      durable: offlineDurable() as never,
      chainReader: { isLive: false, network: "mainnet", verifyMemoryRefs: async () => ({ checked: false, live: false, reasons: [] }) },
      input: { memoryId: "m3", checkOnChain: true },
    });

    expect(result.valid).toBe(false);
    if ("onChain" in result) {
      expect(result.onChain.reasons).toContain("chain_reader_offline");
    }
  });
});
