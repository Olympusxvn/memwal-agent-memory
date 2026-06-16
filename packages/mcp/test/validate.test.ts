import { describe, expect, it } from "vitest";

import { assertNoBypassFlags, McpValidationError } from "../src/middleware/validate.js";

describe("validate middleware (S-1)", () => {
  it("rejects top-level skipRedaction", () => {
    expect(() => assertNoBypassFlags({ skipRedaction: true, content: "x" })).toThrow(
      McpValidationError,
    );
  });

  it("rejects nested metadata bypass flags", () => {
    expect(() =>
      assertNoBypassFlags({
        content: "hello",
        metadata: { skipGate: "1", source: "test" },
      }),
    ).toThrow(/cannot be bypassed/i);
  });

  it("allows normal metadata", () => {
    expect(() =>
      assertNoBypassFlags({
        content: "hello",
        metadata: { source: "cursor", tag: "note" },
      }),
    ).not.toThrow();
  });
});
