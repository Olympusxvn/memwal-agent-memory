import type { Server } from "node:http";

import express from "express";
import type { Request, Response } from "express";
import {
  hostHeaderValidation,
  localhostHostValidation,
} from "@modelcontextprotocol/sdk/server/middleware/hostHeaderValidation.js";

import { resolveBearerToken } from "../middleware/auth.js";
import { sendJsonRpcError } from "../middleware/http-errors.js";
import { applySecurityHeaders } from "../middleware/http-security.js";
import { resolveMcpConfig, validateHttpStartupConfig } from "../runtime/create-deps.js";
import type { MemWalMcpDeps } from "../types.js";
import { HttpSessionRegistry } from "./http-sessions.js";

const LOCALHOST_HOSTS = ["127.0.0.1", "localhost", "::1"];

export interface HttpTransportHandle {
  readonly port: number;
  readonly host: string;
  close(): Promise<void>;
}

function createHttpApp(
  host: string,
  maxBodyBytes: number,
  allowedHosts?: string[],
): express.Application {
  const app = express();
  app.use(express.json({ limit: maxBodyBytes }));

  if (allowedHosts && allowedHosts.length > 0) {
    app.use(hostHeaderValidation(allowedHosts));
  } else if (LOCALHOST_HOSTS.includes(host)) {
    app.use(localhostHostValidation());
  } else if (host === "0.0.0.0" || host === "::") {
    // eslint-disable-next-line no-console
    console.warn(
      `Warning: MCP HTTP binding to ${host} without allowedHosts — set MCP_HTTP_ALLOWED_HOSTS`,
    );
  }

  return app;
}

export async function startHttpTransport(deps: MemWalMcpDeps): Promise<HttpTransportHandle> {
  const config = resolveMcpConfig(deps.config);
  validateHttpStartupConfig(config);

  const http = config.http ?? {
    host: "127.0.0.1",
    port: 8787,
    requireAuth: true,
    maxBodyBytes: 262_144,
  };
  const host = http.host ?? "127.0.0.1";
  const port = http.port ?? 8787;
  const maxBodyBytes = http.maxBodyBytes ?? 262_144;
  const allowedHosts =
    http.allowedHosts ?? (host === "0.0.0.0" ? undefined : [host, "localhost"]);

  const app = createHttpApp(host, maxBodyBytes, allowedHosts);
  const registry = new HttpSessionRegistry();

  app.all("/mcp", async (req: Request, res: Response) => {
    applySecurityHeaders(res);

    const authorized =
      !http.requireAuth ||
      resolveBearerToken(req.headers.authorization, http.bearerToken);

    const headerSessionId =
      typeof req.headers["mcp-session-id"] === "string"
        ? req.headers["mcp-session-id"]
        : undefined;

    const resolved = await registry.resolveForRequest(
      deps,
      authorized,
      headerSessionId,
      req.body,
    );

    if (!resolved.ok) {
      sendJsonRpcError(res, resolved.httpStatus, resolved.code, resolved.message);
      return;
    }

    await resolved.entry.transport.handleRequest(req, res, req.body);
  });

  app.get("/health", (_req: Request, res: Response) => {
    applySecurityHeaders(res);
    res.json({
      ok: true,
      server: "memwal-agent-memory",
      transport: "streamable-http",
      sessions: registry.size(),
    });
  });

  app.get("/ready", (_req: Request, res: Response) => {
    applySecurityHeaders(res);
    res.json({ ready: true });
  });

  let httpServer: Server | undefined;

  const listenPort = await new Promise<number>((resolve, reject) => {
    httpServer = app.listen(port, host, () => {
      const addr = httpServer?.address();
      const actualPort =
        typeof addr === "object" && addr ? addr.port : port;
      // eslint-disable-next-line no-console
      console.error(
        `memwal-agent-memory MCP Streamable HTTP on http://${host}:${actualPort}/mcp`,
      );
      resolve(actualPort);
    });
    httpServer.on("error", reject);
  });

  return {
    port: listenPort,
    host,
    async close() {
      if (httpServer && "closeAllConnections" in httpServer) {
        (httpServer as Server & { closeAllConnections: () => void }).closeAllConnections();
      }
      await new Promise<void>((resolve, reject) => {
        if (!httpServer) {
          resolve();
          return;
        }
        httpServer.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}

export type { MemWalMcpDeps };
