import { describe, expect, it, vi } from "vitest";

import { MemWalTransportError, shouldRetryMemWalError } from "../src/errors.js";
import { withRetry } from "../src/retry.js";

describe("withRetry", () => {
  it("retries transport errors then succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new MemWalTransportError("fail"))
      .mockResolvedValueOnce("ok");
    const result = await withRetry(() => fn(), {
      maxAttempts: 3,
      shouldRetry: shouldRetryMemWalError,
      baseDelayMs: 1,
      maxDelayMs: 2,
    });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
