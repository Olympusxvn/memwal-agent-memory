import type { SwarmHookContext } from "@memwalpp/core";

import { DEMO_BOUNTY } from "./stub-bounty.js";
import type { AgentRuntime } from "../runtime/create-runtime.js";

export async function runAgentDemo(runtime: AgentRuntime): Promise<void> {
  const { bridge, sync, durableLive, storeKind } = runtime;
  const namespace = DEMO_BOUNTY.namespace;

  console.log("\n=== MemWal++ agent:demo ===\n");
  console.log(`Store: ${storeKind} | Durable: ${durableLive ? "live (MEMWAL_* set)" : "offline (local-only OK)"}\n`);

  await bridge.saveMemory(DEMO_BOUNTY.requirement, {
    role: "seed",
    bountyId: DEMO_BOUNTY.id,
  });

  const seedRows = await runtime.local.recall({ namespace, query: "", limit: 5 });
  const seedId = seedRows[0]?.id;
  if (seedId) {
    const push = await sync.pushOne(seedId, { namespace });
    console.log(
      push.pushed
        ? `✓ pushOne → blob ${push.blobId ?? "(pending)"}`
        : `○ pushOne skipped (${push.reason ?? "unknown"})`,
    );
  }

  const hunterCtx: SwarmHookContext = {
    namespace,
    agentId: "hunter-demo",
    taskId: "demo-task-1",
    bountyId: DEMO_BOUNTY.id,
    packId: DEMO_BOUNTY.id,
  };

  const prompt = "How do we fulfill the bounty with verifiable Walrus proof?";
  const augmented = await bridge.beforeRemember(hunterCtx, prompt);
  console.log("\n--- beforeRemember (context injected) ---");
  console.log(augmented.slice(0, 600) + (augmented.length > 600 ? "…" : ""));

  const thinkResponse =
    "Use MemorySyncService: local recall, redactForUpstream, quality gate, then MemWal remember. " +
    "Judges verify walrusBlobId on synced rows.";

  await bridge.afterThink(hunterCtx, thinkResponse);
  console.log("\n--- afterThink ---");
  console.log(`Captured memory id: ${hunterCtx.lastMemoryId ?? "(none)"}`);

  await bridge.onTaskComplete(
    hunterCtx,
    "Demo task complete — hybrid memory path exercised.",
  );
  console.log("\n--- onTaskComplete ---");
  console.log("syncPending + outcome stub logged.\n");
  console.log("=== demo finished (exit 0) ===\n");
}
