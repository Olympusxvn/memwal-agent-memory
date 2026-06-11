import os from "node:os";
import path from "node:path";

import {
  consoleSyncLogger,
  createMemWalAgentBridge,
  createMemorySyncService,
  type MemWalAgentBridge as IMemWalAgentBridge,
  type MemorySyncService,
} from "@memwalpp/core";
import type { LocalMemoryStore } from "@memwalpp/local-memory";
import { createSharedLocalStore } from "@memwalpp/local-memory";
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

export function createAgentRuntime(options?: {
  namespace?: string;
  autoPushAfterThink?: boolean;
}): AgentRuntime {
  const namespace =
    (options?.namespace ?? process.env.MEMWAL_NAMESPACE?.trim()) || "bounty-demo";
  const autoPush =
    options?.autoPushAfterThink ??
    process.env.MEMWAL_AUTO_PUSH?.trim() === "1";

  const { store: local, kind: storeKind } = createSharedLocalStore(namespace, {
    baseDir: path.join(os.tmpdir(), "memwalpp-agent-swarm"),
  });
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
