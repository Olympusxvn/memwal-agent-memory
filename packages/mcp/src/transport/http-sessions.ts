import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { createMemWalMcpServer, type MemWalMcpServer } from "../server.js";
import type { MemWalMcpDeps, ToolSession } from "../types.js";

export interface HttpSessionEntry {
  readonly sessionId: string;
  readonly instance: MemWalMcpServer;
  readonly transport: StreamableHTTPServerTransport;
  readonly session: ToolSession;
}

function isInitializeRequest(body: unknown): boolean {
  const messages = Array.isArray(body) ? body : body ? [body] : [];
  return messages.some(
    (message) =>
      message &&
      typeof message === "object" &&
      (message as { method?: string }).method === "initialize",
  );
}

export { isInitializeRequest };

/** Per-MCP-session registry — one transport + server instance per client session (RL-5). */
export class HttpSessionRegistry {
  private readonly sessions = new Map<string, HttpSessionEntry>();

  size(): number {
    return this.sessions.size;
  }

  get(sessionId: string): HttpSessionEntry | undefined {
    return this.sessions.get(sessionId);
  }

  remove(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  async createSession(deps: MemWalMcpDeps, authorized: boolean): Promise<HttpSessionEntry> {
    const sessionId = crypto.randomUUID();
    const session: ToolSession = {
      id: sessionId,
      authorized,
      transport: "http",
    };
    const instance = createMemWalMcpServer(deps, { session, forceRateLimit: true });
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => sessionId,
      onsessionclosed: (id) => {
        this.remove(id);
      },
    });
    await instance.mcp.connect(transport);
    const entry: HttpSessionEntry = { sessionId, instance, transport, session };
    this.sessions.set(sessionId, entry);
    return entry;
  }

  /**
   * Resolve the transport entry for an incoming HTTP request.
   * Creates a new session on MCP `initialize`; otherwise requires `mcp-session-id`.
   */
  async resolveForRequest(
    deps: MemWalMcpDeps,
    authorized: boolean,
    headerSessionId: string | undefined,
    body: unknown,
  ): Promise<
    | { ok: true; entry: HttpSessionEntry }
    | { ok: false; httpStatus: number; code: number; message: string }
  > {
    const isInit = isInitializeRequest(body);

    if (isInit && !headerSessionId) {
      const entry = await this.createSession(deps, authorized);
      return { ok: true, entry };
    }

    if (headerSessionId) {
      const entry = this.get(headerSessionId);
      if (!entry) {
        return { ok: false, httpStatus: 404, code: -32001, message: "Session not found" };
      }
      entry.session.authorized = authorized;
      return { ok: true, entry };
    }

    return {
      ok: false,
      httpStatus: 400,
      code: -32600,
      message: "Bad Request: Mcp-Session-Id header is required",
    };
  }
}
