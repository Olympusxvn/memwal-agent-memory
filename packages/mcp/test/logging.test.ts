import { describe, expect, it } from "vitest";

import { sanitizeLogFields } from "../src/middleware/logger.js";

describe("logging policy (S-3)", () => {
  it("drops forbidden content keys", () => {
    const out = sanitizeLogFields({
      correlationId: "mcp-1",
      content: "secret memory text",
      proof: '{"memoryId":"x"}',
    });
    expect(out.correlationId).toBe("mcp-1");
    expect(out.content).toBeUndefined();
    expect(out.proof).toBeUndefined();
  });

  it("redacts email-like values in allowed keys", () => {
    const out = sanitizeLogFields({
      recordId: "abc",
      namespace: "user@example.com",
    });
    expect(out.namespace).toBe("[redacted]");
  });

  it("truncates long string values", () => {
    const long = "a".repeat(300);
    const out = sanitizeLogFields({ recordId: long });
    expect(String(out.recordId).endsWith("…")).toBe(true);
    expect(String(out.recordId).length).toBeLessThan(100);
  });
});
