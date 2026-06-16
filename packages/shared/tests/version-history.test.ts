import { describe, expect, it } from "vitest";

import {
  appendVersionHistory,
  bumpContentVersion,
  parseVersionHistory,
  serializeVersionHistory,
} from "../src/version-history.js";

describe("version-history metadata (1.1e)", () => {
  it("appendVersionHistory builds JSON timeline", () => {
    const first = appendVersionHistory(undefined, {
      version: "1",
      source: "local",
      atMs: 100,
      event: "created",
    });
    const second = appendVersionHistory(
      { versionHistory: first },
      {
        version: "2",
        source: "durable",
        atMs: 200,
        blobId: "blob-1",
        event: "promoted",
        synced: true,
      },
    );
    const entries = parseVersionHistory(second);
    expect(entries).toHaveLength(2);
    expect(entries[1]?.blobId).toBe("blob-1");
  });

  it("dedupes identical consecutive entries", () => {
    const entry = {
      version: "1",
      source: "local" as const,
      atMs: 1,
      event: "created" as const,
    };
    const once = appendVersionHistory(undefined, entry);
    const twice = appendVersionHistory({ versionHistory: once }, entry);
    expect(parseVersionHistory(twice)).toHaveLength(1);
  });

  it("bumpContentVersion increments", () => {
    expect(bumpContentVersion("1")).toBe("2");
    expect(bumpContentVersion(undefined)).toBe("1");
  });

  it("serializeVersionHistory caps entries", () => {
    let history = serializeVersionHistory([]);
    for (let i = 0; i < 60; i++) {
      history = appendVersionHistory({ versionHistory: history }, {
        version: String(i),
        source: "local",
        atMs: i,
      });
    }
    expect(parseVersionHistory(history).length).toBeLessThanOrEqual(50);
  });
});
