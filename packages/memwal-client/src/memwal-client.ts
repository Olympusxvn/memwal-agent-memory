import type { MemWalClientConfig } from "./config.js";
import { loadMemWalConfigFromEnv } from "./config.js";
import {
  createDurableMemoryStore,
  durableOptionsFromConfig,
} from "./durable/durable-memory-store.js";
import type { DurableMemoryStore } from "./durable/types.js";
import type { MemWalService } from "./service.js";
import { createMemWalService, tryCreateMemWalServiceFromEnv } from "./service.js";

/**
 * High-level MemWal++ client: config + low-level {@link MemWalService} + {@link DurableMemoryStore}.
 *
 * Encryption (SEAL) happens on the MemWal relayer during `remember`; callers in `core` run
 * `redactForUpstream` before `durable.remember`.
 */
export class MemWalClient {
  readonly config: MemWalClientConfig;
  readonly service: MemWalService;
  readonly durable: DurableMemoryStore;

  private constructor(config: MemWalClientConfig, service: MemWalService) {
    this.config = config;
    this.service = service;
    this.durable = createDurableMemoryStore(service, durableOptionsFromConfig(config));
  }

  /** Alias: delegate private key (hex). */
  get privateKey(): MemWalClientConfig["key"] {
    return this.config.key;
  }

  /** Alias: MemWal relayer URL. */
  get relayerUrl(): string | undefined {
    return this.config.serverUrl;
  }

  get accountId(): string {
    return this.config.accountId;
  }

  get namespace(): string | undefined {
    return this.config.namespace;
  }

  static create(config: MemWalClientConfig): MemWalClient {
    return new MemWalClient(config, createMemWalService(config));
  }

  static tryFromEnv(env?: Record<string, string | undefined>): MemWalClient | null {
    const cfg = loadMemWalConfigFromEnv(env);
    if (!cfg) return null;
    const service = tryCreateMemWalServiceFromEnv(env);
    return new MemWalClient(cfg, service);
  }

  destroy(): void {
    this.durable.destroy();
  }
}
