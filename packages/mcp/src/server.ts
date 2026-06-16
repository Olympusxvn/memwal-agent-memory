import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { assertAuthorized, type ToolKind, toolKind } from "./middleware/auth.js";
import {
  createMcpLogger,
  logToolCall,
  nextCorrelationId,
  safeToolMeta,
} from "./middleware/logger.js";
import { McpRateLimitError, RateLimiter } from "./middleware/rate-limit.js";
import { assertNoBypassFlags, McpValidationError } from "./middleware/validate.js";
import { resolveMcpConfig } from "./runtime/create-deps.js";
import type { MemWalMcpDeps, ToolSession } from "./types.js";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "./types.js";
import {
  handleGetLineage,
  handleGetStats,
  handleGetVersionHistory,
  handleRecall,
  handleRemember,
  handleSearch,
  handleVerify,
  type ToolRuntime,
} from "./tools/memory.js";
import { handleSoftDelete, handleSync } from "./tools/sync.js";

function toolText(payload: Record<string, unknown>): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

function readOnlyHint(kind: ToolKind): boolean {
  return kind === "read";
}

export interface CreateMcpServerOptions {
  /** Override session context (HTTP uses one per MCP session). */
  session?: ToolSession;
  /** HTTP sessions always rate-limit; stdio may disable via config (RL-4). */
  forceRateLimit?: boolean;
}

export interface MemWalMcpServer {
  readonly mcp: McpServer;
  readonly session: ToolSession;
  connectStdio(): Promise<void>;
  startHttp(): Promise<void>;
}

export function createMemWalMcpServer(
  deps: MemWalMcpDeps,
  options?: CreateMcpServerOptions,
): MemWalMcpServer {
  const config = resolveMcpConfig(deps.config);
  const session: ToolSession = options?.session ?? {
    id: config.transport === "stdio" ? "stdio" : "http",
    authorized: config.transport === "stdio",
    transport: config.transport ?? "stdio",
  };

  const rt: ToolRuntime = {
    sync: deps.sync,
    local: deps.local,
    durable: deps.durable,
    config,
  };

  const logger = createMcpLogger("mcp");
  const disableRateLimit =
    !options?.forceRateLimit &&
    config.transport === "stdio" &&
    config.rateLimit?.disabled !== false;
  const limiter = new RateLimiter(
    options?.forceRateLimit ? { ...config.rateLimit, disabled: false } : config.rateLimit,
    disableRateLimit,
  );

  const mcp = new McpServer(
    { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
    {
      capabilities: {
        tools: { listChanged: true },
        logging: {},
      },
    },
  );

  function wrapTool(
    name: string,
    description: string,
    inputSchema: z.ZodRawShape | undefined,
    handler: (args: Record<string, unknown>) => Promise<Record<string, unknown>>,
  ): void {
    const kind = toolKind(name);
    mcp.registerTool(
      name,
      {
        description,
        ...(inputSchema ? { inputSchema } : {}),
        annotations: {
          readOnlyHint: readOnlyHint(kind),
          destructiveHint: name === "softDelete",
        },
      },
      async (args) => {
        assertAuthorized(session, name);
        const rate = limiter.check(name);
        if (!rate.ok) {
          throw new McpRateLimitError(rate.retryAfterMs);
        }
        const cid = nextCorrelationId();
        const rawArgs = args as Record<string, unknown>;
        try {
          assertNoBypassFlags(rawArgs);
        } catch (err) {
          if (err instanceof McpValidationError) {
            throw err;
          }
          throw err;
        }
        logToolCall(logger, name, {
          correlationId: cid,
          session: session.id,
          ...safeToolMeta(rawArgs),
        });
        const result = await handler(rawArgs);
        if (typeof result.recordId === "string") {
          logToolCall(logger, `${name}:done`, {
            correlationId: cid,
            recordId: result.recordId,
            skipReason: typeof result.skipReason === "string" ? result.skipReason : undefined,
          });
        }
        return toolText(result);
      },
    );
  }

  wrapTool(
    "remember",
    "[W] Store memory locally (SQLite). Optional redactLocal applies PII redaction before persist; otherwise redaction runs on sync (Gate: on sync).",
    {
      content: z.string().max(8000),
      namespace: z.string().optional(),
      metadata: z.record(z.string()).optional(),
      redactLocal: z.boolean().optional(),
    },
    (args) => handleRemember(rt, args as Parameters<typeof handleRemember>[1]),
  );

  wrapTool(
    "recall",
    "[R] Hybrid recall via MemorySyncService.pullQuery (local + optional durable hydrate).",
    {
      query: z.string(),
      options: z
        .object({
          namespace: z.string().optional(),
          limit: z.number().int().min(1).max(50).optional(),
          forceDurable: z.boolean().optional(),
        })
        .optional(),
    },
    (args) => handleRecall(rt, args as Parameters<typeof handleRecall>[1]),
  );

  wrapTool(
    "search",
    "[R] Hybrid ranked search — local semantic rank + optional Walrus hydrate (1.1b). Returns scores, hitSource (local|durable|hybrid), verifiable flag.",
    {
      semantic_query: z.string().min(1),
      limit: z.number().int().min(1).max(50).optional(),
      namespace: z.string().optional(),
      forceDurable: z.boolean().optional(),
      includeProof: z.boolean().optional(),
    },
    (args) => handleSearch(rt, args as Parameters<typeof handleSearch>[1]),
  );

  wrapTool(
    "getLineage",
    "[R] Layered lineage graph — local ancestry + optional Sui pack lineage (1.1d). Metadata only, no raw content.",
    {
      memoryId: z.string().min(1),
      includeOnChain: z.boolean().optional(),
      maxDepth: z.number().int().min(1).max(32).optional(),
    },
    (args) => handleGetLineage(rt, args as Parameters<typeof handleGetLineage>[1]),
  );

  wrapTool(
    "getVersionHistory",
    "[R] Real version timeline — local edits + Walrus promotions from metadata index (1.1e).",
    {
      memoryId: z.string().min(1),
      includeProof: z.boolean().optional(),
    },
    (args) => handleGetVersionHistory(rt, args as Parameters<typeof handleGetVersionHistory>[1]),
  );

  wrapTool(
    "sync",
    "[D] Promote pending local rows — redaction + quality gate per row (Gate: yes, unskippable).",
    {
      forceDurable: z.boolean().optional(),
      namespace: z.string().optional(),
    },
    (args) => handleSync(rt, args as Parameters<typeof handleSync>[1]),
  );

  wrapTool(
    "softDelete",
    "[W] Tombstone a memory (metadata.deleted=1).",
    { memoryId: z.string().min(1), namespace: z.string().optional() },
    (args) => handleSoftDelete(rt, args as Parameters<typeof handleSoftDelete>[1]),
  );

  wrapTool(
    "getStats",
    "[R] Local row counts + durable connectivity.",
    undefined,
    () => handleGetStats(rt),
  );

  wrapTool(
    "verify",
    "[R] Layered verify: local proof, optional Walrus blob check, optional Sui on-chain refs (packId/bountyId/txDigest).",
    {
      proof: z.string().optional(),
      memoryId: z.string().optional(),
      checkWalrus: z.boolean().optional(),
      checkOnChain: z.boolean().optional(),
    },
    (args) => handleVerify(rt, args as Parameters<typeof handleVerify>[1]),
  );

  return {
    mcp,
    session,
    async connectStdio() {
      const { startStdioTransport } = await import("./transport/stdio.js");
      await startStdioTransport(mcp);
    },
    async startHttp() {
      const { startHttpTransport } = await import("./transport/http.js");
      await startHttpTransport(deps);
    },
  };
}
