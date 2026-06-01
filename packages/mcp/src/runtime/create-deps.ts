import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);

import { createMemorySyncService, noopSyncLogger } from "@memwalpp/core";
import type { LocalMemoryStore } from "@memwalpp/local-memory";
import { InMemoryLocalMemoryStore, SqliteLocalStore } from "@memwalpp/local-memory";
import {
  createDurableMemoryStore,
  tryCreateMemWalServiceFromEnv,
} from "@memwalpp/memwal-client";

import { assertNoOwnerKeys } from "../middleware/auth.js";
import type { MemWalMcpConfig, MemWalMcpDeps } from "../types.js";

function sqliteNativeAvailable(): boolean {
  try {
    require("better-sqlite3");
    return true;
  } catch {
    return false;
  }
}

function createLocalStore(namespace: string): LocalMemoryStore {
  if (!sqliteNativeAvailable()) {
    return new InMemoryLocalMemoryStore();
  }
  const dir = path.join(os.tmpdir(), "memwalpp-mcp");
  fs.mkdirSync(dir, { recursive: true });
  const dbPath = path.join(dir, `${namespace.replace(/[^a-z0-9-_]/gi, "_")}.db`);
  try {
    return new SqliteLocalStore(dbPath);
  } catch {
    return new InMemoryLocalMemoryStore();
  }
}

export function resolveMcpConfig(
  config?: MemWalMcpConfig,
  env: NodeJS.ProcessEnv = process.env,
): Required<Pick<MemWalMcpConfig, "defaultNamespace" | "transport">> & MemWalMcpConfig {
  const transport =
    (config?.transport ??
      (env.MCP_TRANSPORT?.trim() as "stdio" | "http" | undefined)) ||
    "stdio";
  const defaultNamespace =
    config?.defaultNamespace?.trim() ||
    env.MEMWAL_NAMESPACE?.trim() ||
    "default";
  const host = config?.http?.host ?? env.MCP_HTTP_HOST?.trim() ?? "127.0.0.1";
  const port = config?.http?.port ?? Number.parseInt(env.MCP_HTTP_PORT?.trim() ?? "8787", 10);
  const bearerToken =
    config?.http?.bearerToken?.trim() ||
    env.MCP_HTTP_TOKEN?.trim() ||
    env.MCP_BEARER_TOKEN?.trim();
  const requireAuth =
    config?.http?.requireAuth ??
    (transport === "http" ? env.MCP_HTTP_REQUIRE_AUTH?.trim() !== "0" : false);

  return {
    ...config,
    transport,
    defaultNamespace,
    http: {
      host,
      port: Number.isFinite(port) ? port : 8787,
      requireAuth,
      bearerToken,
    },
  };
}

/** Build injected deps from env — same wiring as agent-swarm, MCP-specific defaults. */
export function createMemWalMcpDepsFromEnv(config?: MemWalMcpConfig): MemWalMcpDeps {
  assertNoOwnerKeys(process.env);
  const resolved = resolveMcpConfig(config);
  const namespace = resolved.defaultNamespace ?? "default";
  const local = createLocalStore(namespace);
  const service = tryCreateMemWalServiceFromEnv();
  const durable = createDurableMemoryStore(service, { defaultNamespace: namespace });
  const sync = createMemorySyncService({
    local,
    durable,
    config: {
      defaultNamespace: namespace,
      qualityMin: resolved.qualityMin,
    },
    logger: noopSyncLogger,
  });
  return { sync, local, durable, config: resolved };
}
