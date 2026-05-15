import type { LocalMemoryStore } from "@memwalpp/local-memory";
import type { MemoryRecord } from "@memwalpp/shared";

import { toOutcomeEvent } from "../memory/outcome-bridge.js";
import type { MemorySyncService } from "../memory/memory-sync-service.js";
import type { SyncLogger } from "../memory/sync-logger.js";
import { noopSyncLogger } from "../memory/sync-logger.js";
import type { AgentBridgeConfig, SwarmHookContext } from "./types.js";

const MEMORY_BLOCK_START = "## Memory context";
const DEFAULT_RECALL_LIMIT = 5;
const DEFAULT_MAX_CONTEXT = 2000;
const DEFAULT_MAX_CONTENT = 8000;

const STOP_WORDS = new Set([
  "about",
  "after",
  "before",
  "could",
  "fulfill",
  "how",
  "that",
  "the",
  "this",
  "what",
  "when",
  "with",
  "would",
]);

/** Pick a short keyword for local substring recall (full prompts rarely match row content). */
export function extractRecallQuery(prompt: string): string {
  const withoutBlock = prompt.includes(MEMORY_BLOCK_START)
    ? prompt.slice(0, prompt.indexOf(MEMORY_BLOCK_START)).trim()
    : prompt.trim();
  const tokens =
    withoutBlock.toLowerCase().match(/[a-z0-9]{4,}/g)?.filter((w) => !STOP_WORDS.has(w)) ?? [];
  if (tokens.length === 0) return "memory";
  tokens.sort((a, b) => b.length - a.length || a.localeCompare(b));
  return tokens[0]!;
}

export function formatMemoryContext(records: MemoryRecord[], maxChars: number): string {
  if (records.length === 0) return "";
  const lines = records.map((r) => `- ${r.content.replace(/\s+/g, " ").trim().slice(0, 400)}`);
  let block = `${MEMORY_BLOCK_START}\n${lines.join("\n")}\n\n`;
  if (block.length > maxChars) {
    block = `${block.slice(0, maxChars)}\n…\n\n`;
  }
  return block;
}

export interface MemWalSwarmHooks {
  beforeRemember(ctx: SwarmHookContext, prompt: string): Promise<string>;
  afterThink(ctx: SwarmHookContext, response: string): Promise<void>;
  onTaskComplete(ctx: SwarmHookContext, summary: string): Promise<void>;
}

export function createMemWalSwarmHooks(deps: {
  sync: MemorySyncService;
  local: LocalMemoryStore;
  config?: AgentBridgeConfig;
  logger?: SyncLogger;
}): MemWalSwarmHooks {
  const log = deps.logger ?? noopSyncLogger;
  const recallLimit = deps.config?.recallLimit ?? DEFAULT_RECALL_LIMIT;
  const maxContextChars = deps.config?.maxContextChars ?? DEFAULT_MAX_CONTEXT;
  const maxContent = deps.config?.demoMaxContentChars ?? DEFAULT_MAX_CONTENT;
  const autoPush = deps.config?.autoPushAfterThink ?? false;
  const defaultNs = deps.config?.defaultNamespace ?? "default";

  return {
    async beforeRemember(ctx, prompt) {
      const namespace = ctx.namespace || defaultNs;
      const query = extractRecallQuery(prompt);
      try {
        let hits = await deps.sync.pullQuery(query, {
          namespace,
          limit: recallLimit,
          forceDurable: true,
        });
        if (hits.length === 0) {
          hits = await deps.sync.pullQuery("", { namespace, limit: recallLimit });
        }
        const block = formatMemoryContext(hits, maxContextChars);
        if (!block) return prompt;
        return block + prompt;
      } catch (err) {
        log.warn("beforeRemember recall failed", {
          agentId: ctx.agentId,
          error: err instanceof Error ? err.name : "unknown",
        });
        return prompt;
      }
    },

    async afterThink(ctx, response) {
      const namespace = ctx.namespace || defaultNs;
      const trimmed = response.trim().slice(0, maxContent);
      if (!trimmed) return;

      const now = Date.now();
      const id = ctx.lastMemoryId ?? crypto.randomUUID();
      const record: MemoryRecord = {
        id,
        namespace,
        content: trimmed,
        createdAtMs: now,
        updatedAtMs: now,
        synced: false,
        metadata: {
          agentId: ctx.agentId,
          taskId: ctx.taskId ?? "",
          bountyId: ctx.bountyId ?? "",
        },
      };

      await deps.local.remember(record);
      ctx.lastMemoryId = id;

      if (!autoPush) return;

      const push = await deps.sync.pushOne(id, { namespace });
      if (!push.pushed) {
        log.info("afterThink push skipped", {
          recordId: id,
          reason: push.reason ?? "unknown",
        });
      }
    },

    async onTaskComplete(ctx, summary) {
      const namespace = ctx.namespace || defaultNs;
      const metrics = await deps.sync.syncPending({ namespace });

      if (ctx.lastMemoryId) {
        await deps.sync.pushOne(ctx.lastMemoryId, { namespace });
      }

      if (ctx.packId) {
        const outcome = toOutcomeEvent({
          packId: ctx.packId,
          scoreDelta: 1,
          proofDigest: `demo-${ctx.taskId ?? ctx.agentId}-${Date.now()}`,
        });
        log.info("onTaskComplete outcome", {
          agentId: ctx.agentId,
          summaryLen: summary.length,
          pushed: metrics.pushed,
          outcomeKind: outcome.kind,
        });
      } else {
        log.info("onTaskComplete sync", {
          agentId: ctx.agentId,
          pushed: metrics.pushed,
          skipped: metrics.skipped,
        });
      }
    },
  };
}
