export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  jitterRatio?: number;
  /** Return true to retry (e.g. transport / 429). */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

const DEFAULTS: Required<Omit<RetryOptions, "shouldRetry">> = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 8000,
  factor: 2,
  jitterRatio: 0.2,
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt: number, opts: Required<Omit<RetryOptions, "shouldRetry">>): number {
  const exp = opts.baseDelayMs * opts.factor ** (attempt - 1);
  const capped = Math.min(exp, opts.maxDelayMs);
  const jitter = capped * opts.jitterRatio * (Math.random() * 2 - 1);
  return Math.max(0, Math.floor(capped + jitter));
}

/**
 * Run `fn` with exponential backoff retries.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const cfg = { ...DEFAULTS, ...options };
  const shouldRetry = options.shouldRetry ?? (() => false);
  let lastError: unknown;
  for (let attempt = 1; attempt <= cfg.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt >= cfg.maxAttempts || !shouldRetry(e, attempt)) {
        throw e;
      }
      await delay(backoffMs(attempt, cfg));
    }
  }
  throw lastError;
}
