import type { SwarmHookContext } from "@memwalpp/core";

import type { AgentRuntime } from "../runtime/create-runtime.js";
import {
  demoBanner,
  demoInfo,
  demoOk,
  demoSkip,
  demoStep,
  demoSummary,
} from "../util/demo-log.js";
import { DEMO_BOUNTY } from "./stub-bounty.js";

const STEPS = 7;

export async function runBountyHunt(runtime: AgentRuntime): Promise<void> {
  const { bridge, sync, durableLive, storeKind } = runtime;
  const namespace = DEMO_BOUNTY.namespace;

  demoBanner(
    "MemWal Agent Memory · agent:bounty-hunt",
    "Two-agent swarm: Poster seeds bounty → Hunter recalls & improves → sync",
  );

  demoStep(1, STEPS, "Bounty (stub — Move escrow in contracts package)");
  demoInfo("Title", DEMO_BOUNTY.title);
  demoInfo("Reward", `${DEMO_BOUNTY.rewardWal} WAL (demo coin)`);
  demoInfo("Store", storeKind === "sqlite" ? "SQLite" : "in-memory");
  demoInfo("Durable", durableLive ? "live" : "offline");

  const posterCtx: SwarmHookContext = {
    namespace,
    agentId: "agent-poster",
    taskId: "post-bounty",
    bountyId: DEMO_BOUNTY.id,
    packId: DEMO_BOUNTY.id,
  };

  demoStep(2, STEPS, "Agent: Poster — post requirement to local memory");
  await bridge.saveMemory(
    `[BOUNTY] ${DEMO_BOUNTY.title}\n${DEMO_BOUNTY.requirement}`,
    { role: "bounty-poster", bountyId: DEMO_BOUNTY.id },
  );
  demoOk("Poster memory saved");
  void posterCtx;

  demoStep(3, STEPS, "Poster — pushOne (redact → MemWal → Walrus)");
  const posterRows = await runtime.local.recall({ namespace, query: "", limit: 5 });
  const posterMemoryId = posterRows.find((r) => r.metadata?.role === "bounty-poster")?.id;
  let posterBlob = "—";
  if (posterMemoryId) {
    const push = await sync.pushOne(posterMemoryId, { namespace });
    if (push.pushed) {
      posterBlob = push.blobId ?? "(pending)";
      demoOk(`Promoted — blob ${posterBlob}`);
    } else {
      demoSkip(`Skipped (${push.reason})`);
    }
  }

  const hunterCtx: SwarmHookContext = {
    namespace,
    agentId: "agent-hunter",
    taskId: "fulfill-bounty",
    bountyId: DEMO_BOUNTY.id,
    packId: DEMO_BOUNTY.id,
  };

  demoStep(4, STEPS, "Agent: Hunter — beforeRemember (pullQuery hybrid recall)");
  const prompt = "Evaluate and fulfill the Walrus verification bounty.";
  const withMemory = await bridge.beforeRemember(hunterCtx, prompt);
  const injected = withMemory.length - prompt.length;
  demoOk(injected > 0 ? `Injected ${injected} chars from hybrid memory` : "Recall local-only (no match)");

  demoStep(5, STEPS, "Agent: Hunter — afterThink + onTaskComplete");
  const improved =
    "Integrated bounty context: promote redacted memories via MemorySyncService; " +
    "durable_wins on sealed conflict (ADR-010); emit outcome for on-chain proof digest.";

  await bridge.afterThink(hunterCtx, improved);
  demoOk(`Captured hunter memory ${hunterCtx.lastMemoryId ?? "—"}`);

  await bridge.onTaskComplete(
    hunterCtx,
    "Bounty fulfillment draft complete — ready for Move escrow.",
  );
  demoOk("syncPending + outcome stub emitted");

  demoStep(6, STEPS, "exportPack — collect Walrus blob refs");
  const exported = await bridge.exportPack();
  demoOk(`${exported.blobIds.length} durable blob id(s) in pack export`);

  demoStep(7, STEPS, "Optional — post bounty on Sui (S4 chain client)");
  if (!runtime.chain) {
    demoSkip("Chain offline — set SUI_DELEGATE_PRIVATE_KEY + MARKETPLACE_OBJECT_ID");
  } else {
    try {
      const posted = await runtime.chain.postBounty({
        amountMist: 1_000_000_000n,
        deadlineMs: BigInt(Date.now() + 86_400_000),
        description: `${DEMO_BOUNTY.title}\n${DEMO_BOUNTY.requirement}`,
      });
      demoOk(`On-chain bounty tx ${posted.txDigest}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      demoSkip(`Chain post failed (${msg})`);
    }
  }

  demoSummary({
    "Agents": "poster + hunter",
    "Flow": "post → push → recall → improve → sync",
    "Walrus": durableLive ? `blob ref: ${posterBlob}` : "offline — set MEMWAL_* to promote",
    "Chain": runtime.chain ? "live (delegate key configured)" : "offline — SUI_DELEGATE_PRIVATE_KEY",
    "Next": "Dashboard kiosk PTBs + v2 upgrade bootstrap",
  });
}
