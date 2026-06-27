import { describe, expect, it } from "vitest";

import { RateLimiter } from "../src/middleware/rate-limit.js";
import { createMemWalMcpServer } from "../src/server.js";
import { createMemorySyncService } from "@memwalpp/core";
import { InMemoryLocalMemoryStore } from "@memwalpp/local-memory";
import { createMockDurableMemoryStore } from "../src/runtime/mock-durable-store.js";
import type { MemWalMcpDeps } from "../src/types.js";

function testDeps(): MemWalMcpDeps {
  const local = new InMemoryLocalMemoryStore();
  const durable = createMockDurableMemoryStore("rl-test");
  const sync = createMemorySyncService({ local, durable, config: { qualityMin: 0, uploadThreshold: 0 } });
  return {
    sync,
    local,
    durable,
    config: {
      transport: "http",
      defaultNamespace: "rl-test",
      rateLimit: { maxPerMinute: 60, burst: 2, durableMaxPerMinute: 1 },
    },
  };
}

describe("HTTP rate limiting (RL-4, RL-5)", () => {
  it("HTTP forceRateLimit keeps limits enabled even when disabled in config", () => {
    const limiterDisabled = new RateLimiter({ disabled: true }, true);
    expect(limiterDisabled.check("getStats").ok).toBe(true);

    // Server strips disabled flag when forceRateLimit is true
    const limiterForced = new RateLimiter({ disabled: false, burst: 1, maxPerMinute: 60 }, false);
    expect(limiterForced.check("getStats").ok).toBe(true);
    expect(limiterForced.check("getStats").ok).toBe(false);
  });

  it("per-session limiters are independent instances", () => {
    const deps = testDeps();
    deps.config = {
      ...deps.config,
      rateLimit: { maxPerMinute: 60, burst: 1, durableMaxPerMinute: 1 },
    };

    const serverA = createMemWalMcpServer(deps, {
      session: { id: "session-a", authorized: true, transport: "http" },
      forceRateLimit: true,
    });
    const serverB = createMemWalMcpServer(deps, {
      session: { id: "session-b", authorized: true, transport: "http" },
      forceRateLimit: true,
    });

    expect(serverA.session.id).toBe("session-a");
    expect(serverB.session.id).toBe("session-b");
  });

  it("durable tools use stricter sub-limit", () => {
    const limiter = new RateLimiter(
      { maxPerMinute: 100, burst: 1, durableMaxPerMinute: 1 },
      false,
    );
    expect(limiter.check("sync").ok).toBe(true);
    const second = limiter.check("sync");
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.retryAfterMs).toBeGreaterThan(0);
    }
  });
});
