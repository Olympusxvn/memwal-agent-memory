import { describe, expect, it } from "vitest";

import {
  appendLineageEvent,
  parseLineageHistory,
  readLineageParentId,
  serializeLineageHistory,
} from "../src/lineage.js";

describe("lineage metadata (1.1d)", () => {
  it("appendLineageEvent builds JSON timeline", () => {
    const first = appendLineageEvent(undefined, {
      memoryId: "m1",
      event: "created",
      atMs: 100,
    });
    const second = appendLineageEvent(
      { lineageHistory: first },
      {
        memoryId: "m1",
        event: "promoted",
        atMs: 200,
        walrusBlobId: "blob-1",
      },
    );
    const entries = parseLineageHistory(second);
    expect(entries).toHaveLength(2);
    expect(entries[1]?.walrusBlobId).toBe("blob-1");
  });

  it("readLineageParentId prefers lineageParentId over legacy parentId", () => {
    expect(readLineageParentId({ lineageParentId: "a", parentId: "b" })).toBe("a");
    expect(readLineageParentId({ parentId: "legacy" })).toBe("legacy");
  });

  it("dedupes identical consecutive entries", () => {
    const entry = {
      memoryId: "m1",
      event: "created" as const,
      atMs: 1,
    };
    const once = appendLineageEvent(undefined, entry);
    const twice = appendLineageEvent({ lineageHistory: once }, entry);
    expect(parseLineageHistory(twice)).toHaveLength(1);
  });

  it("serializeLineageHistory caps entries", () => {
    let history = serializeLineageHistory([]);
    for (let i = 0; i < 60; i++) {
      history = appendLineageEvent({ lineageHistory: history }, {
        memoryId: "m1",
        event: "edited",
        atMs: i,
      });
    }
    expect(parseLineageHistory(history).length).toBeLessThanOrEqual(50);
  });
});
