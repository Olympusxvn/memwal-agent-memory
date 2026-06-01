import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { ChainClient } from "@memwalpp/memwal-client";

import { assertAuthorized, type ToolKind, toolKind } from "./middleware/auth.js";
import { createMcpLogger, logToolCall, nextCorrelationId } from "./middleware/logger.js";
import { McpRateLimitError, RateLimiter } from "./middleware/rate-limit.js";
import { resolveMcpConfig } from "./runtime/create-deps.js";
import type { MemWalMcpDeps, ToolSession } from "./types.js";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "./types.js";
import {
  handleBuyMemoryPack,
  handleCreateBounty,
  handleForkMemory,
  handleFulfillBounty,
  handleListMemoryPack,
} from "./tools/chain-handlers.js";
import {
  handleGetLineage,
  handleGetStats,
  handlePromote,
  handleRecall,
  handleRemember,
  handleSearch,
  handleSoftDelete,
  handleSync,
  handleVerify,
  type ToolRuntime,
} from "./tools/handlers.js";

function toolText(payload: Record<string, unknown>): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

function readOnlyHint(kind: ToolKind): boolean {
  return kind === "read";
}

export interface MemWalMcpServer {
  readonly mcp: McpServer;
  readonly session: ToolSession;
  connectStdio(): Promise<void>;
  startHttp(): Promise<void>;
}

export function createMemWalMcpServer(deps: MemWalMcpDeps): MemWalMcpServer {
  const config = resolveMcpConfig(deps.config);
  const session: ToolSession = {
    id: config.transport === "stdio" ? "stdio" : "http",
    authorized: config.transport === "stdio",
    transport: config.transport ?? "stdio",
  };

  const rt: ToolRuntime & { chain: ChainClient | null } = {
    sync: deps.sync,
    local: deps.local,
    durable: deps.durable,
    config,
    chain: deps.chain ?? null,
  };

  const logger = createMcpLogger("mcp");
  const limiter = new RateLimiter(
    config.rateLimit,
    config.transport === "stdio" && config.rateLimit?.disabled !== false,
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
    inputSchema: z.ZodRawShape,
    handler: (args: Record<string, unknown>) => Promise<Record<string, unknown>>,
  ): void {
    const kind = toolKind(name);
    mcp.registerTool(
      name,
      {
        description,
        inputSchema,
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
        logToolCall(logger, name, { correlationId: cid, session: session.id });
        const result = await handler(args as Record<string, unknown>);
        return toolText(result);
      },
    );
  }

  wrapTool(
    "remember",
    "[W] Store memory locally; optional promote runs redaction + quality gate + Walrus push (Gate: yes if promote).",
    {
      content: z.string().max(8000),
      namespace: z.string().optional(),
      tags: z.array(z.string()).optional(),
      promote: z.boolean().optional(),
    },
    (args) => handleRemember(rt, args as Parameters<typeof handleRemember>[1]),
  );

  wrapTool(
    "recall",
    "[R] Hybrid recall via MemorySyncService.pullQuery (local + optional durable hydrate).",
    {
      query: z.string(),
      namespace: z.string().optional(),
      limit: z.number().int().min(1).max(50).optional(),
      forceDurable: z.boolean().optional(),
    },
    (args) => handleRecall(rt, args as Parameters<typeof handleRecall>[1]),
  );

  wrapTool(
    "search",
    "[R] Fast local-only recall (no network).",
    {
      query: z.string(),
      namespace: z.string().optional(),
      limit: z.number().int().min(1).max(50).optional(),
    },
    (args) => handleSearch(rt, args as Parameters<typeof handleSearch>[1]),
  );

  wrapTool(
    "sync",
    "[D] Promote pending local rows — redaction + quality gate per row (Gate: yes).",
    {
      namespace: z.string().optional(),
      mode: z.enum(["pending", "full"]).optional(),
    },
    (args) => handleSync(rt, args as Parameters<typeof handleSync>[1]),
  );

  wrapTool(
    "promote",
    "[D] Force gate + redaction + durable write for one recordId (Gate: yes).",
    {
      recordId: z.string(),
      namespace: z.string().optional(),
    },
    (args) => handlePromote(rt, args as Parameters<typeof handlePromote>[1]),
  );

  wrapTool(
    "softDelete",
    "[W] Tombstone a memory (metadata.deleted=1).",
    { recordId: z.string(), namespace: z.string().optional() },
    (args) => handleSoftDelete(rt, args as Parameters<typeof handleSoftDelete>[1]),
  );

  wrapTool(
    "verify",
    "[R] Return walrusBlobId + sync status for verifiability.",
    { recordId: z.string() },
    (args) => handleVerify(rt, args as Parameters<typeof handleVerify>[1]),
  );

  wrapTool(
    "getStats",
    "[R] Local row counts + durable connectivity.",
    {},
    () => handleGetStats(rt),
  );

  wrapTool(
    "getLineage",
    "[R] Fork/version graph — on-chain index when Move v2 objects are bootstrapped.",
    { recordId: z.string().optional(), packId: z.string().optional() },
    () => Promise.resolve(handleGetLineage()),
  );

  wrapTool(
    "createBounty",
    "[C] Post WAL escrow bounty (v1 or v2 when bootstrapped). Requires delegate key + treasury cap env.",
    {
      description: z.string().min(1).max(4000),
      amountMist: z.string().optional(),
      deadlineHours: z.number().int().min(1).max(720).optional(),
      minScore: z.number().int().min(0).max(100).optional(),
    },
    (args) => handleCreateBounty(rt, args as Parameters<typeof handleCreateBounty>[1]),
  );

  wrapTool(
    "fulfillBounty",
    "[C+D] Promote record → Walrus blob id → submit_fulfillment on-chain (Gate: yes).",
    {
      bountyId: z.string(),
      recordId: z.string(),
      namespace: z.string().optional(),
    },
    (args) => handleFulfillBounty(rt, args as Parameters<typeof handleFulfillBounty>[1]),
  );

  wrapTool(
    "listMemoryPack",
    "[C] List owned MemoryPack on marketplace (v1 or v2).",
    {
      packObjectId: z.string(),
      priceMist: z.string(),
    },
    (args) => handleListMemoryPack(rt, args as Parameters<typeof handleListMemoryPack>[1]),
  );

  wrapTool(
    "buyMemoryPack",
    "[C] Buy listed pack by pack id; mints demo WAL from treasury if needed.",
    {
      packId: z.string(),
      priceMist: z.string(),
    },
    (args) => handleBuyMemoryPack(rt, args as Parameters<typeof handleBuyMemoryPack>[1]),
  );

  wrapTool(
    "forkMemory",
    "[C+D] Promote improved memory then fork_pack on-chain (v2 only).",
    {
      parentPackObjectId: z.string(),
      recordId: z.string(),
      newBlobIds: z.array(z.string()).optional(),
      royaltyBps: z.number().int().min(0).max(1000).optional(),
      namespace: z.string().optional(),
    },
    (args) => handleForkMemory(rt, args as Parameters<typeof handleForkMemory>[1]),
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
      await startHttpTransport(deps, session);
    },
  };
}
