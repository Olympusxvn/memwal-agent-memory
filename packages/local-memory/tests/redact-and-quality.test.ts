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

  it("redacts formatted US phone numbers", () => {
    const r = redactForUpstream("call 555-123-4567 or (555) 123-4567 today");
    expect(r.text).not.toContain("555-123-4567");
    expect(r.text).not.toContain("(555) 123-4567");
    expect(r.piiFlags).toContain("phone");
  });

  it("redacts bare 10-digit phone when not an id suffix", () => {
    const r = redactForUpstream("support line 5551234567 available");
    expect(r.text).toContain("[redacted-phone]");
    expect(r.text).not.toContain("5551234567");
    expect(r.piiFlags).toContain("phone");
  });

  it("does not redact slug-id with UUID suffix (MCP markers)", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const r = redactForUpstream(`e2e-sync-${uuid}: hybrid memory marker.`);
    expect(r.text).toContain(uuid);
    expect(r.text).not.toContain("[redacted-phone]");
    expect(r.piiFlags).not.toContain("phone");
  });

  it("does not redact slug-id with millisecond timestamp suffix", () => {
    const r = redactForUpstream(
      "sync-roundtrip-1739723871234: enough content for sync and recall after durable push.",
    );
    expect(r.text).toContain("sync-roundtrip-1739723871234");
    expect(r.text).not.toContain("[redacted-phone]");
    expect(r.piiFlags).not.toContain("phone");
  });

  it("does not redact hex hash suffix after hyphen", () => {
    const hash = "a1b2c3d4e5f6789012345678abcdef01";
    const r = redactForUpstream(`blob-${hash} stored on Walrus.`);
    expect(r.text).toContain(`blob-${hash}`);
    expect(r.piiFlags).not.toContain("phone");
  });

  it("does not redact digits inside a UUID", () => {
    const uuid = "12345678-1234-5678-9abc-123456789012";
    const r = redactForUpstream(`record id ${uuid} synced.`);
    expect(r.text).toContain(uuid);
    expect(r.piiFlags).not.toContain("phone");
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
