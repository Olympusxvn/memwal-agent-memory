import type { Request, Response } from "express";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

import { resolveBearerToken } from "../middleware/auth.js";
import { resolveMcpConfig } from "../runtime/create-deps.js";
import type { MemWalMcpDeps, ToolSession } from "../types.js";
import { createMemWalMcpServer } from "../server.js";

const transports = new Map<string, SSEServerTransport>();

export async function startHttpTransport(
  deps: MemWalMcpDeps,
  session: ToolSession,
): Promise<void> {
  const config = resolveMcpConfig(deps.config);
  const http = config.http ?? { host: "127.0.0.1", port: 8787, requireAuth: true };
  const host = http.host ?? "127.0.0.1";
  const port = http.port ?? 8787;
  const app = createMcpExpressApp({ host, allowedHosts: [host, "localhost"] });

  app.get("/mcp", async (_req: Request, res: Response) => {
    const instance = createMemWalMcpServer(deps);
    const transport = new SSEServerTransport("/mcp/messages", res);
    transports.set(transport.sessionId, transport);
    transport.onclose = () => {
      transports.delete(transport.sessionId);
      void instance.mcp.close();
    };
    await instance.mcp.connect(transport);
    await transport.start();
  });

  app.post("/mcp/messages", async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string | undefined;
    if (!sessionId) {
      res.status(400).json({ error: "sessionId required" });
      return;
    }
    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(404).json({ error: "session not found" });
      return;
    }

    if (http.requireAuth) {
      const ok = resolveBearerToken(req.headers.authorization, http.bearerToken);
      session.authorized = ok;
      if (!ok) {
        res.status(401).json({ error: "unauthorized" });
        return;
      }
    } else {
      session.authorized = true;
    }

    await transport.handlePostMessage(req, res, req.body);
  });

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ ok: true, server: "memwal-agent-memory" });
  });

  await new Promise<void>((resolve) => {
    app.listen(port, host, () => {
      // eslint-disable-next-line no-console
      console.error(
        `memwal-agent-memory MCP HTTP listening on http://${host}:${port}/mcp`,
      );
      resolve();
    });
  });
}

export type { MemWalMcpDeps };
