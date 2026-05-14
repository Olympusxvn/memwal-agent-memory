import { MemWal } from "@mysten-incubation/memwal";

import type { MemWalClientConfig } from "./config.js";
import { loadMemWalConfigFromEnv } from "./config.js";
import { MemWalConfigError } from "./errors.js";

export interface MemWalService {
  remember(
    text: string,
    opts?: { namespace?: string; metadata?: Record<string, string> },
  ): Promise<{ jobId?: string; blobId?: string }>;
  recall(query: string, limit?: number): Promise<string[]>;
  destroy(): void;
  readonly isLive: boolean;
}

class OfflineMemWalService implements MemWalService {
  readonly isLive = false;

  remember(): Promise<{ jobId?: string; blobId?: string }> {
    return Promise.reject(
      new MemWalConfigError(
        "MemWal is not configured. Set MEMWAL_PRIVATE_KEY and MEMWAL_ACCOUNT_ID (see .env.example).",
      ),
    );
  }

  recall(): Promise<string[]> {
    return Promise.reject(
      new MemWalConfigError(
        "MemWal is not configured. Set MEMWAL_PRIVATE_KEY and MEMWAL_ACCOUNT_ID (see .env.example).",
      ),
    );
  }

  destroy(): void {
    /* no-op */
  }
}

class LiveMemWalService implements MemWalService {
  readonly isLive = true;
  private readonly inner: MemWal;
  private readonly defaultNamespace: string | undefined;
  private readonly waitForRemember: boolean;

  constructor(config: MemWalClientConfig) {
    const { waitForRemember, ...memWalConfig } = config;
    this.inner = MemWal.create(memWalConfig);
    this.defaultNamespace = memWalConfig.namespace;
    this.waitForRemember = waitForRemember ?? false;
  }

  async remember(
    text: string,
    opts?: { namespace?: string; metadata?: Record<string, string> },
  ): Promise<{ jobId?: string; blobId?: string }> {
    if (!text.trim()) {
      throw new RangeError("remember: text must be non-empty");
    }
    const ns = opts?.namespace ?? opts?.metadata?.namespace ?? this.defaultNamespace;
    if (this.waitForRemember) {
      const result = await this.inner.rememberAndWait(text, ns);
      return { jobId: result.job_id, blobId: result.blob_id };
    }
    const accepted = await this.inner.remember(text, ns);
    return { jobId: accepted.job_id };
  }

  async recall(query: string, limit = 10): Promise<string[]> {
    if (!query.trim()) {
      throw new RangeError("recall: query must be non-empty");
    }
    const result = await this.inner.recall(query, limit, this.defaultNamespace);
    return result.results.map((m) => m.text);
  }

  destroy(): void {
    this.inner.destroy();
  }
}

const offlineSingleton = new OfflineMemWalService();

/** Live client; throws if config invalid. */
export function createMemWalService(config: MemWalClientConfig): MemWalService {
  if (!config.key || !config.accountId) {
    throw new MemWalConfigError("createMemWalService: `key` and `accountId` are required.");
  }
  return new LiveMemWalService(config);
}

/**
 * Returns live service when env is complete, otherwise a shared offline service
 * whose methods reject with `MemWalConfigError` (safe for CI / `pnpm check`).
 */
export function tryCreateMemWalServiceFromEnv(
  env?: Record<string, string | undefined>,
): MemWalService {
  const cfg = loadMemWalConfigFromEnv(env);
  if (!cfg) {
    return offlineSingleton;
  }
  return new LiveMemWalService(cfg);
}
