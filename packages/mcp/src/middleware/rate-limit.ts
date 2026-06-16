import type { RateLimitConfig } from "../types.js";
import { toolKind, type ToolKind } from "./auth.js";

interface Bucket {
  tokens: number;
  lastRefillMs: number;
}

export class RateLimiter {
  private readonly general: Bucket;
  private readonly durable: Bucket;
  private readonly maxPerMinute: number;
  private readonly burst: number;
  private readonly durableMax: number;
  private readonly disabled: boolean;

  constructor(config?: RateLimitConfig, disableLimiter = false) {
    this.maxPerMinute = config?.maxPerMinute ?? 60;
    this.burst = config?.burst ?? 10;
    this.durableMax = config?.durableMaxPerMinute ?? 10;
    this.disabled = disableLimiter ? true : config?.disabled === true;
    const now = Date.now();
    this.general = { tokens: this.burst, lastRefillMs: now };
    this.durable = { tokens: this.burst, lastRefillMs: now };
  }

  check(toolName: string): { ok: true } | { ok: false; retryAfterMs: number } {
    if (this.disabled) return { ok: true };

    const kind = toolKind(toolName);
    const bucket = kind === "durable" ? this.durable : this.general;
    const max = kind === "durable" ? this.durableMax : this.maxPerMinute;

    this.refill(bucket, max);
    if (bucket.tokens < 1) {
      return { ok: false, retryAfterMs: Math.ceil(60_000 / max) };
    }
    bucket.tokens -= 1;
    return { ok: true };
  }

  private refill(bucket: Bucket, maxPerMinute: number): void {
    const now = Date.now();
    const elapsed = now - bucket.lastRefillMs;
    if (elapsed <= 0) return;
    const refill = (elapsed / 60_000) * maxPerMinute;
    bucket.tokens = Math.min(this.burst, bucket.tokens + refill);
    bucket.lastRefillMs = now;
  }
}

export class McpRateLimitError extends Error {
  readonly code = -32002;
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super(`Rate limit exceeded; retry after ${retryAfterMs}ms`);
    this.name = "McpRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}
