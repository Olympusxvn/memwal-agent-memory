import { describe, expect, it } from "vitest";

import { SqliteLocalStore } from "../src/store/sqlite/SQLiteLocalStore.js";
import {
  ftsQueryTokens,
  matchFtsContent,
  shouldUseFtsRecall,
  toFtsMatchExpression,
} from "../src/fts-recall.js";

describe("fts-recall", () => {
  it("auto mode uses FTS for multi-token queries", () => {
    expect(shouldUseFtsRecall("hello world", "auto")).toBe(true);
    expect(shouldUseFtsRecall("hello", "auto")).toBe(false);
  });

  it("matchFtsContent requires all tokens", () => {
    expect(matchFtsContent("Brazil wins the cup", "Brazil cup")).toBe(true);
    expect(matchFtsContent("Brazil wins", "Brazil cup")).toBe(false);
  });

  it("toFtsMatchExpression AND-joins quoted tokens", () => {
    expect(toFtsMatchExpression("foo bar")).toBe('"foo" AND "bar"');
    expect(ftsQueryTokens("  Foo  BAR ")).toEqual(["foo", "bar"]);
  });

  it("sqlite FTS recall finds AND-token rows", async () => {
    const store = new SqliteLocalStore(":memory:");
    await store.remember({
      id: "a",
      namespace: "fts-test",
      content: "Brazil wins the Walrus hybrid memory cup",
      createdAtMs: 1,
      updatedAtMs: 1,
      synced: false,
    });
    await store.remember({
      id: "b",
      namespace: "fts-test",
      content: "Argentina only local recall",
      createdAtMs: 2,
      updatedAtMs: 2,
      synced: false,
    });
    const hits = await store.recall({
      namespace: "fts-test",
      query: "Brazil Walrus",
      limit: 5,
      searchMode: "fts",
    });
    expect(hits).toHaveLength(1);
    expect(hits[0]?.id).toBe("a");
    store.close();
  });
});
