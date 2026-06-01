import type { MemorySyncService } from "@memwalpp/core";
import type { LocalMemoryStore } from "@memwalpp/local-memory";
import type { DurableMemoryStore } from "@memwalpp/memwal-client";

export type McpTransport = "stdio" | "http";

export interface RateLimitConfig {
  /** Max tool calls per minute (default 60). */
  maxPerMinute?: number;
  /** Burst allowance (default 10). */
  burst?: number;
  /** Max durable/chain tool calls per minute (default 10). */
  durableMaxPerMinute?: number;
  /** Disable limits (stdio only; HTTP always limits). */
  disabled?: boolean;
}

export interface MemWalMcpHttpConfig {
  host: string;
  port: number;
  requireAuth: boolean;
  /** Expected bearer token when requireAuth is true. */
  bearerToken?: string;
}

export interface MemWalMcpConfig {
  transport?: McpTransport;
  http?: Partial<MemWalMcpHttpConfig>;
  qualityMin?: number;
  defaultNamespace?: string;
  rateLimit?: RateLimitConfig;
}

export interface MemWalMcpDeps {
  sync: MemorySyncService;
  local: LocalMemoryStore;
  durable: DurableMemoryStore;
  config?: MemWalMcpConfig;
}

export interface ToolSession {
  /** HTTP session id or "stdio" for local transport. */
  id: string;
  authorized: boolean;
  transport: McpTransport;
}

export const MCP_SERVER_NAME = "memwal-agent-memory";
export const MCP_SERVER_VERSION = "0.1.0";
export const MAX_CONTENT_LENGTH = 8000;
