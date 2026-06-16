import { describe, expect, it } from "vitest";

import { InMemoryLocalMemoryStore } from "@memwalpp/local-memory";
import { MEMORY_METADATA_KEYS } from "@memwalpp/shared";

import {
  buildLocalLineageGraph,
  mergeOnChainLineage,
  resolveLineageForRecord,
} from "../src/memory/lineage-index.js";

describe("lineage-index (1.1d)", () => {
  it("buildLocalLineageGraph walks parent chain and finds children", () => {
    const parent = {
      id: "parent1",
      namespace: "default",
      content: "parent memory",
      createdAtMs: 1,
      updatedAtMs: 1,
      synced: false,
      metadata: {
        [MEMORY_METADATA_KEYS.lineageRootId]: "parent1",
        [MEMORY_METADATA_KEYS.forkDepth]: "0",
      },
    };
    const child = {
      id: "child1",
      namespace: "default",
      content: "child memory",
      createdAtMs: 2,
      updatedAtMs: 2,
      synced: true,
      walrusBlobId: "blob-child",
      metadata: {
        [MEMORY_METADATA_KEYS.lineageParentId]: "parent1",
        [MEMORY_METADATA_KEYS.lineageRootId]: "parent1",
        [MEMORY_METADATA_KEYS.forkDepth]: "1",
      },
    };
    const otherChild = {
      id: "child2",
      namespace: "default",
      content: "another child",
      createdAtMs: 3,
      updatedAtMs: 3,
      synced: false,
      metadata: {
        [MEMORY_METADATA_KEYS.lineageParentId]: "parent1",
      },
    };

    const graph = buildLocalLineageGraph(parent, [parent, child, otherChild]);
    expect(graph.rootMemoryId).toBe("parent1");
    expect(graph.forkDepth).toBe(0);
    expect(graph.edges.filter((e) => e.type === "child")).toHaveLength(2);

    const childGraph = buildLocalLineageGraph(child, [parent, child, otherChild]);
    expect(childGraph.nodes.some((n) => n.memoryId === "parent1")).toBe(true);
    expect(childGraph.edges.some((e) => e.type === "parent")).toBe(true);
  });

  it("mergeOnChainLineage adds pack fork edges", () => {
    const local = buildLocalLineageGraph(
      {
        id: "m1",
        namespace: "default",
        content: "x",
        createdAtMs: 1,
        updatedAtMs: 1,
        synced: true,
        metadata: { [MEMORY_METADATA_KEYS.packId]: "0xpack2" },
      },
      [],
    );
    const merged = mergeOnChainLineage(local, {
      checked: true,
      live: true,
      packId: "0xpack2",
      parentPackId: "0xpack1",
      rootPackId: "0xroot",
      forkDepth: 1,
      ancestors: ["0xcreator"],
      reasons: [],
    });
    expect(merged.rootId).toBe("pack:0xroot");
    expect(merged.edges.some((e) => e.type === "forked")).toBe(true);
  });

  it("resolveLineageForRecord uses mock chain reader", async () => {
    const local = new InMemoryLocalMemoryStore();
    await local.remember({
      id: "m1",
      namespace: "default",
      content: "lineage test",
      createdAtMs: 1,
      updatedAtMs: 1,
      synced: true,
      metadata: { [MEMORY_METADATA_KEYS.packId]: "0xpack2" },
    });
    const row = (await local.getById("m1"))!;

    const result = await resolveLineageForRecord({
      local,
      row,
      durableLive: true,
      readPackLineage: async () => ({
        checked: true,
        live: true,
        packId: "0xpack2",
        parentPackId: "0xpack1",
        rootPackId: "0xroot",
        forkDepth: 1,
        ancestors: [],
        reasons: [],
      }),
    });

    expect(result.found).toBe(true);
    expect(result.onChain.parentPackId).toBe("0xpack1");
    expect(result.graph.nodes.length).toBeGreaterThan(0);
  });
});
