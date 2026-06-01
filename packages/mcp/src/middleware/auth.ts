import type { ToolSession } from "../types.js";

export type ToolKind = "read" | "mutate" | "durable" | "chain";

const MUTATING: ToolKind[] = ["mutate", "durable", "chain"];

export function toolKind(name: string): ToolKind {
  switch (name) {
    case "recall":
    case "search":
    case "verify":
    case "getLineage":
    case "getStats":
      return "read";
    case "remember":
    case "softDelete":
    case "forkMemory":
      return "mutate";
    case "sync":
    case "promote":
    case "fulfillBounty":
      return "durable";
    default:
      return "chain";
  }
}

export function requiresAuth(kind: ToolKind): boolean {
  return MUTATING.includes(kind) || kind === "durable" || kind === "chain";
}

export function assertAuthorized(session: ToolSession, toolName: string): void {
  const kind = toolKind(toolName);
  if (session.transport === "stdio") {
    return;
  }
  if (requiresAuth(kind) && !session.authorized) {
    throw new McpAuthError("Mutating or chain tools require Authorization bearer token");
  }
}

export class McpAuthError extends Error {
  readonly code = -32001;

  constructor(message: string) {
    super(message);
    this.name = "McpAuthError";
  }
}

export function resolveBearerToken(
  header: string | undefined,
  expected: string | undefined,
): boolean {
  if (!expected?.trim()) return false;
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() === expected.trim();
}

export function assertNoOwnerKeys(env: NodeJS.ProcessEnv): void {
  if (env.MEMWAL_OWNER_KEY?.trim() || env.SUI_OWNER_PRIVATE_KEY?.trim()) {
    throw new Error(
      "MCP server refuses owner keys (ADR-002). Configure MEMWAL_PRIVATE_KEY as delegate only.",
    );
  }
}
