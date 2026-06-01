import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);

import {
  consoleSyncLogger,
  createMemWalAgentBridge,
  createMemorySyncService,
  type MemWalAgentBridge as IMemWalAgentBridge,
  type MemorySyncService,
} from "@memwalpp/core";
import type { LocalMemoryStore } from "@memwalpp/local-memory";
import { InMemoryLocalMemoryStore, SqliteLocalStore } from "@memwalpp/local-memory";
import {
  createDurableMemoryStore,
  tryCreateChainClientFromEnv,
  tryCreateMemWalServiceFromEnv,
  type ChainClient,
} from "@memwalpp/memwal-client";

export interface AgentRuntime {
  local: LocalMemoryStore;
  sync: MemorySyncService;
  bridge: IMemWalAgentBridge;
  durableLive: boolean;
  storeKind: "sqlite" | "memory";
  chain: ChainClient | null;
}

function sqliteNativeAvailable(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("better-sqlite3");
    return true;
  } catch {
    return false;
  }
}

/** Prefer SQLite on disk; fall back to in-memory when native bindings are missing. */
export function createSharedLocalStore(namespace: string): {
  store: LocalMemoryStore;
  kind: "sqlite" | "memory";
} {
  if (!sqliteNativeAvailable()) {
    return { store: new InMemoryLocalMemoryStore(), kind: "memory" };
  }

  const dir = path.join(os.tmpdir(), "memwalpp-agent-swarm");
  fs.mkdirSync(dir, { recursive: true });
  const dbPath = path.join(dir, `${namespace.replace(/[^a-z0-9-_]/gi, "_")}.db`);

  try {
    return { store: new SqliteLocalStore(dbPath), kind: "sqlite" };
  } catch {
    return { store: new InMemoryLocalMemoryStore(), kind: "memory" };
  }
}

export function createAgentRuntime(options?: {
  namespace?: string;
  autoPushAfterThink?: boolean;
}): AgentRuntime {
  const namespace =
    (options?.namespace ?? process.env.MEMWAL_NAMESPACE?.trim()) || "bounty-demo";
  const autoPush =
    options?.autoPushAfterThink ??
    process.env.MEMWAL_AUTO_PUSH?.trim() === "1";

  const { store: local, kind: storeKind } = createSharedLocalStore(namespace);
  const service = tryCreateMemWalServiceFromEnv();
  const durable = createDurableMemoryStore(service, {
    defaultNamespace: namespace,
  });
  const logger = consoleSyncLogger("agent-swarm");

  const sync = createMemorySyncService({
    local,
    durable,
    config: { defaultNamespace: namespace, qualityMin: 0 },
    logger,
  });

  const bridge = createMemWalAgentBridge({
    sync,
    local,
    logger,
    config: {
      defaultNamespace: namespace,
      autoPushAfterThink: autoPush,
      recallLimit: 5,
    },
  });

  return {
    local,
    sync,
    bridge,
    durableLive: service.isLive,
    storeKind,
    chain: tryCreateChainClientFromEnv(),
  };
}
