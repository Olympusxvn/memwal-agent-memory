import type { SwarmHookContext } from "@memwalpp/core";

import { DEMO_BOUNTY } from "./stub-bounty.js";
import type { AgentRuntime } from "../runtime/create-runtime.js";

export async function runBountyHunt(runtime: AgentRuntime): Promise<void> {
  const { bridge, sync, durableLive, storeKind } = runtime;
  const namespace = DEMO_BOUNTY.namespace;

  console.log("\n=== MemWal++ agent:bounty-hunt (2 agents) ===\n");
  console.log(`Bounty: ${DEMO_BOUNTY.title}`);
  console.log(`Store: ${storeKind} | Durable: ${durableLive ? "live" : "offline"}\n`);

  const posterCtx: SwarmHookContext = {
    namespace,
    agentId: "agent-poster",
    taskId: "post-bounty",
    bountyId: DEMO_BOUNTY.id,
    packId: DEMO_BOUNTY.id,
  };

  await bridge.saveMemory(
    `[BOUNTY] ${DEMO_BOUNTY.title}\n${DEMO_BOUNTY.requirement}`,
    { role: "bounty-poster", bountyId: DEMO_BOUNTY.id },
  );

  const posterRows = await runtime.local.recall({ namespace, query: "", limit: 5 });
  const posterMemoryId = posterRows.find((r) => r.metadata?.role === "bounty-poster")?.id;
  if (posterMemoryId) {
    const push = await sync.pushOne(posterMemoryId, { namespace });
    console.log(
      `[poster] pushOne: ${push.pushed ? "promoted" : `skipped (${push.reason})`}`,
    );
  }

  const hunterCtx: SwarmHookContext = {
    namespace,
    agentId: "agent-hunter",
    taskId: "fulfill-bounty",
    bountyId: DEMO_BOUNTY.id,
    packId: DEMO_BOUNTY.id,
  };

  const prompt = "Evaluate and fulfill the Walrus verification bounty.";
  const withMemory = await bridge.beforeRemember(hunterCtx, prompt);
  console.log(`\n[hunter] beforeRemember: +${withMemory.length - prompt.length} chars context\n`);

  const improved =
    "Integrated bounty context: promote redacted memories via MemorySyncService; " +
    "durable_wins on sealed conflict (ADR-010); emit outcome for on-chain proof digest.";

  await bridge.afterThink(hunterCtx, improved);
  console.log(`[hunter] afterThink: memory ${hunterCtx.lastMemoryId ?? "—"}`);

  await bridge.onTaskComplete(
    hunterCtx,
    "Bounty fulfillment draft complete — ready for Move escrow in Phase 3 contracts.",
  );

  const exported = await bridge.exportPack();
  console.log(`\n[hunter] exportPack blobIds: ${exported.blobIds.length}`);
  console.log("\n=== bounty-hunt finished (exit 0) ===\n");

  void posterCtx;
}
