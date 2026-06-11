import { describe, expect, it } from "vitest";

import { redactForUpstream, scoreQuality, scoreSnippet } from "../src/index.js";

describe("redactForUpstream", () => {
  it("redacts email and sets flag", () => {
    const r = redactForUpstream("contact me at user@example.com please");
    expect(r.text).toContain("[redacted-email]");
    expect(r.text).not.toContain("user@example.com");
    expect(r.piiFlags).toContain("email");
  });

  it("redacts Bearer token", () => {
    const r = redactForUpstream("Authorization: Bearer abcdefghijklmnopqrstuvwxyz012345");
    expect(r.text).toContain("[redacted]");
    expect(r.piiFlags).toContain("bearer");
  });

  it("redacts sk- style key", () => {
    const r = redactForUpstream("key sk-abcdefghijklmnopqrstuvwxyz1234567890");
    expect(r.text).toContain("[redacted-secret]");
    expect(r.piiFlags).toContain("api_key_sk");
  });

  it("leaves benign text unchanged", () => {
    const r = redactForUpstream("no secrets here");
    expect(r.text).toBe("no secrets here");
    expect(r.piiFlags).toHaveLength(0);
  });

  it("redacts consistently across consecutive calls (no global-regex lastIndex drift)", () => {
    // Module-level /g regexes are reused; String.replace resets lastIndex, but
    // guard against accidental .test()/.exec() regressions that would skip rows.
    for (let i = 0; i < 5; i++) {
      const r = redactForUpstream(`row ${i}: user${i}@example.com and Bearer abcdefghijklmnopqrstuvwxyz012345`);
      expect(r.text).toContain("[redacted-email]");
      expect(r.text).not.toContain(`user${i}@example.com`);
      expect(r.piiFlags).toContain("email");
      expect(r.piiFlags).toContain("bearer");
    }
  });
});

describe("scoreSnippet / scoreQuality", () => {
  it("scoreSnippet is bounded", () => {
    expect(scoreSnippet("")).toBe(0);
    expect(scoreSnippet("hello")).toBeGreaterThanOrEqual(0);
    expect(scoreSnippet("x".repeat(2000))).toBe(100);
  });

  it("scoreQuality empty is 0", () => {
    expect(scoreQuality("   ")).toBe(0);
  });

  it("scoreQuality is deterministic", () => {
    const t = "one two three four five six seven";
    expect(scoreQuality(t)).toBe(scoreQuality(t));
  });
});
