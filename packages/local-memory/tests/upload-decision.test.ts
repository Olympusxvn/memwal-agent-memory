import { describe, expect, it } from "vitest";

import {
  resolvePromoteMode,
  scoreUploadDecision,
  shouldUploadToWalrus,
} from "../src/upload-decision.js";

describe("upload-decision", () => {
  it("resolvePromoteMode from opts and tags", () => {
    expect(resolvePromoteMode(undefined, "keep @local only")).toBe("local");
    expect(resolvePromoteMode(undefined, "promote @walrus please")).toBe("walrus");
    expect(resolvePromoteMode({ promoteMode: "walrus" })).toBe("walrus");
    expect(resolvePromoteMode(undefined, "plain", "local")).toBe("local");
  });

  it("scoreUploadDecision boosts important and artifact metadata", () => {
    const base = scoreUploadDecision("short");
    const boosted = scoreUploadDecision(
      "short but important artifact with enough words for scoring",
      { important: "true", artifact: "true", role: "bounty-poster" },
      6,
    );
    expect(boosted).toBeGreaterThan(base);
  });

  it("shouldUploadToWalrus respects modes and threshold", () => {
    expect(shouldUploadToWalrus({ score: 10, threshold: 65, promoteMode: "local" }).upload).toBe(
      false,
    );
    expect(shouldUploadToWalrus({ score: 10, threshold: 65, promoteMode: "walrus" }).upload).toBe(
      true,
    );
    expect(shouldUploadToWalrus({ score: 70, threshold: 65, promoteMode: "auto" }).reason).toBe(
      "score_ok",
    );
    expect(shouldUploadToWalrus({ score: 50, threshold: 65, promoteMode: "auto" }).reason).toBe(
      "gate",
    );
  });
});
