import { describe, expect, it } from "vitest";

import { scoreSemanticMatch } from "../src/semantic-score.js";

describe("scoreSemanticMatch", () => {
  it("returns 0 for empty query", () => {
    expect(scoreSemanticMatch("", "hello world")).toBe(0);
    expect(scoreSemanticMatch("   ", "hello world")).toBe(0);
  });

  it("scores token overlap", () => {
    const score = scoreSemanticMatch("walrus bounty proof", "Walrus bounty on-chain proof");
    expect(score).toBeGreaterThan(0.5);
  });

  it("adds phrase boost for substring match", () => {
    const partial = scoreSemanticMatch("exact phrase here", "prefix exact phrase here suffix");
    const tokensOnly = scoreSemanticMatch("exact phrase here", "exact tokens without full phrase");
    expect(partial).toBeGreaterThanOrEqual(tokensOnly);
  });

  it("is bounded at 1", () => {
    expect(scoreSemanticMatch("test", "test test test")).toBeLessThanOrEqual(1);
  });
});
