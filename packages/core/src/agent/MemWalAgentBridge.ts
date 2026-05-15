import type { IMemWalAgent } from "@memwalpp/memwal-client";
import type { LocalMemoryStore } from "@memwalpp/local-memory";
import type { MemoryRecord } from "@memwalpp/shared";

import type { MemorySyncService } from "../memory/memory-sync-service.js";
import { createMemWalSwarmHooks, type MemWalSwarmHooks } from "./memwal-swarm-hooks.js";
import type { AgentBridgeConfig, SwarmHookContext } from "./types.js";
import type { SyncLogger } from "../memory/sync-logger.js";

export interface MemWalAgentBridgeDeps {
  sync: MemorySyncService;
  local: LocalMemoryStore;
  config?: AgentBridgeConfig;
  logger?: SyncLogger;
}

/**
 * Framework-agnostic agent bridge: {@link IMemWalAgent} + OpenClaw hook aliases (ADR-011).
 * All durable promotion goes through {@link MemorySyncService} (redact + quality gate).
 */
export class MemWalAgentBridge implements IMemWalAgent<SwarmHookContext> {
  private readonly hooks: MemWalSwarmHooks;
  private readonly defaultNs: string;
  private readonly recallLimit: number;

  constructor(private readonly deps: MemWalAgentBridgeDeps) {
    this.hooks = createMemWalSwarmHooks(deps);
    this.defaultNs = deps.config?.defaultNamespace ?? "default";
    this.recallLimit = deps.config?.recallLimit ?? 5;
  }

  /** ADR-011 / OpenClaw `beforeRemember`. */
  async beforeModelCall(ctx: SwarmHookContext, prompt: string): Promise<string> {
    return this.beforeRemember(ctx, prompt);
  }

  async beforeRemember(ctx: SwarmHookContext, prompt: string): Promise<string> {
    return this.hooks.beforeRemember(ctx, prompt);
  }

  /** ADR-011 / OpenClaw `afterThink`. */
  async afterModelCall(ctx: SwarmHookContext, response: string): Promise<void> {
    return this.afterThink(ctx, response);
  }

  async afterThink(ctx: SwarmHookContext, response: string): Promise<void> {
    return this.hooks.afterThink(ctx, response);
  }

  async onTaskComplete(ctx: SwarmHookContext, summary: string): Promise<void> {
    return this.hooks.onTaskComplete(ctx, summary);
  }

  async saveMemory(
    content: string,
    metadata?: Record<string, string>,
  ): Promise<void> {
    const trimmed = content.trim();
    if (!trimmed) return;
    const now = Date.now();
    const id = crypto.randomUUID();
    const record: MemoryRecord = {
      id,
      namespace: this.defaultNs,
      content: trimmed,
      createdAtMs: now,
      updatedAtMs: now,
      synced: false,
      metadata,
    };
    await this.deps.local.remember(record);
    if (this.deps.config?.autoPushAfterThink) {
      await this.deps.sync.pushOne(id, { namespace: this.defaultNs });
    }
  }

  async queryMemory(query: string): Promise<string[]> {
    const rows = await this.deps.sync.pullQuery(query, {
      namespace: this.defaultNs,
      limit: this.recallLimit,
      forceDurable: true,
    });
    return rows.map((r) => r.content);
  }

  async exportPack(): Promise<{ blobIds: string[] }> {
    const rows = await this.deps.local.recall({
      namespace: this.defaultNs,
      query: "",
      limit: 500,
    });
    const blobIds = rows
      .filter((r) => r.synced && r.walrusBlobId)
      .map((r) => r.walrusBlobId as string);
    return { blobIds };
  }

  async importPack(packId: string): Promise<void> {
    this.deps.logger?.info("importPack stub (Move import deferred)", { packId });
  }
}

export function createMemWalAgentBridge(deps: MemWalAgentBridgeDeps): MemWalAgentBridge {
  return new MemWalAgentBridge(deps);
}
