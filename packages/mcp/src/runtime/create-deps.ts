import os from "node:os";
import path from "node:path";

import { createMemorySyncService, noopSyncLogger } from "@memwalpp/core";
import type { LocalMemoryStore } from "@memwalpp/local-memory";
import { createSharedLocalStore } from "@memwalpp/local-memory";
import type { ChainClient } from "@memwalpp/memwal-client";
import {
  createDurableMemoryStore,
  tryCreateChainClientFromEnv,
  tryCreateChainReaderFromEnv,
  tryCreateMemWalServiceFromEnv,
} from "@memwalpp/memwal-client";

import { assertNoOwnerKeys } from "../middleware/auth.js";
import type { MemWalMcpConfig, MemWalMcpDeps } from "../types.js";
import { createMockDurableMemoryStore } from "./mock-durable-store.js";

function createLocalStore(namespace: string): LocalMemoryStore {
  const baseDir =
    process.env.MEMWAL_MCP_DATA_DIR?.trim() ||
    path.join(os.homedir(), ".memwal-agent-memory", "mcp");
  return createSharedLocalStore(namespace, {
    forceMemory: process.env.MEMWAL_MCP_USE_MEMORY?.trim() === "1",
    baseDir,
  }).store;
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
  const maxBodyBytes =
    config?.http?.maxBodyBytes ??
    Number.parseInt(env.MCP_HTTP_MAX_BODY_BYTES?.trim() ?? "262144", 10);
  const allowedHostsRaw = config?.http?.allowedHosts ?? env.MCP_HTTP_ALLOWED_HOSTS?.trim();
  const allowedHosts = Array.isArray(allowedHostsRaw)
    ? allowedHostsRaw.map((h) => h.trim()).filter(Boolean)
    : allowedHostsRaw
      ? allowedHostsRaw.split(",").map((h: string) => h.trim()).filter(Boolean)
      : undefined;

  return {
    ...config,
    transport,
    defaultNamespace,
    http: {
      host,
      port: Number.isFinite(port) ? port : 8787,
      requireAuth,
      bearerToken,
      maxBodyBytes: Number.isFinite(maxBodyBytes) ? maxBodyBytes : 262_144,
      allowedHosts,
    },
  };
}

/** Fail fast when HTTP auth is enabled but no bearer token is configured (1.1f). */
export function validateHttpStartupConfig(
  config: ReturnType<typeof resolveMcpConfig>,
): void {
  if (config.transport !== "http") return;
  const http = config.http;
  if (!http?.requireAuth) return;
  if (!http.bearerToken?.trim()) {
    throw new Error(
      "HTTP transport with requireAuth enabled requires MCP_HTTP_TOKEN (or MCP_BEARER_TOKEN)",
    );
  }
  if (http.host === "0.0.0.0" && (!http.allowedHosts || http.allowedHosts.length === 0)) {
    throw new Error(
      "Binding to 0.0.0.0 requires MCP_HTTP_ALLOWED_HOSTS (comma-separated) for DNS rebinding protection",
    );
  }
}

/** Build injected deps from env — same wiring as agent-swarm, MCP-specific defaults. */
export function createMemWalMcpDepsFromEnv(config?: MemWalMcpConfig): MemWalMcpDeps {
  assertNoOwnerKeys(process.env);
  const resolved = resolveMcpConfig(config);
  const namespace = resolved.defaultNamespace ?? "default";
  const local = createLocalStore(namespace);
  const useMockDurable = process.env.MEMWAL_MCP_MOCK_DURABLE?.trim() === "1";
  const service = tryCreateMemWalServiceFromEnv();
  const durable = useMockDurable
    ? createMockDurableMemoryStore(namespace)
    : createDurableMemoryStore(service, { defaultNamespace: namespace });
  const sync = createMemorySyncService({
    local,
    durable,
    chainReader: tryCreateChainReaderFromEnv(),
    config: {
      defaultNamespace: namespace,
      qualityMin: resolved.qualityMin,
    },
    logger: noopSyncLogger,
  });
  return {
    sync,
    local,
    durable,
    chain: tryCreateChainClientFromEnv(),
    config: resolved,
  };
}
