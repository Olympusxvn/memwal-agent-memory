import type { SwarmHookContext } from "@memwalpp/core";

import type { AgentRuntime } from "../runtime/create-runtime.js";
import {
  demoBanner,
  demoInfo,
  demoOk,
  demoPreview,
  demoSkip,
  demoStep,
  demoSummary,
} from "../util/demo-log.js";
import { DEMO_BOUNTY } from "./stub-bounty.js";

const STEPS = 5;

export async function runAgentDemo(runtime: AgentRuntime): Promise<void> {
  const { bridge, sync, durableLive, storeKind } = runtime;
  const namespace = DEMO_BOUNTY.namespace;

  demoBanner(
    "MemWal++ · agent:demo",
    "Hybrid memory: local-first → redact → quality gate → MemWal/Walrus",
  );

  demoStep(1, STEPS, "Runtime");
  demoInfo("Local store", storeKind === "sqlite" ? "SQLite (persistent)" : "in-memory");
  demoInfo(
    "Durable (MemWal/Walrus)",
    durableLive ? "LIVE — set MEMWAL_* in .env" : "offline — demo works without keys",
  );
  demoInfo("Namespace", namespace);

  demoStep(2, STEPS, "Seed bounty requirement (local)");
  await bridge.saveMemory(DEMO_BOUNTY.requirement, {
    role: "seed",
    bountyId: DEMO_BOUNTY.id,
  });
  demoOk("Saved to LocalMemoryStore");

  demoStep(3, STEPS, "Promote to durable (pushOne → redactForUpstream)");
  const seedRows = await runtime.local.recall({ namespace, query: "", limit: 5 });
  const seedId = seedRows[0]?.id;
  let promotedBlob = "—";
  if (seedId) {
    const push = await sync.pushOne(seedId, { namespace });
    if (push.pushed) {
      promotedBlob = push.blobId ?? "(pending)";
      demoOk(`Promoted — Walrus blob ref: ${promotedBlob}`);
    } else {
      demoSkip(`Not promoted (${push.reason}) — expected when offline`);
    }
  }

  demoStep(4, STEPS, "Agent turn — beforeRemember + afterThink");
  const hunterCtx: SwarmHookContext = {
    namespace,
    agentId: "hunter-demo",
    taskId: "demo-task-1",
    bountyId: DEMO_BOUNTY.id,
    packId: DEMO_BOUNTY.id,
  };

  const prompt = "How do we fulfill the bounty with verifiable Walrus proof?";
  const augmented = await bridge.beforeRemember(hunterCtx, prompt);
  const injected = augmented.length - prompt.length;
  demoOk(`beforeRemember injected ${injected} chars of hybrid context`);
  if (injected > 0) {
    demoPreview("Context preview", augmented, 400);
  }

  const thinkResponse =
    "Use MemorySyncService: local recall, redactForUpstream, quality gate, then MemWal remember. " +
    "Judges verify walrusBlobId on synced rows.";

  await bridge.afterThink(hunterCtx, thinkResponse);
  demoOk(`afterThink captured memory ${hunterCtx.lastMemoryId ?? "—"}`);

  demoStep(5, STEPS, "onTaskComplete — syncPending + outcome stub (ADR-005)");
  await bridge.onTaskComplete(
    hunterCtx,
    "Demo task complete — hybrid memory path exercised.",
  );
  demoOk("syncPending + toOutcomeEvent logged");

  const synced = seedId
    ? (await runtime.local.getById(seedId))?.synced
    : false;

  demoSummary({
    "Walrus track": "MemWal remember → blobId on MemoryRecord.walrusBlobId",
    "Hybrid sync": "MemorySyncService in @memwalpp/core",
    "Hooks": "beforeRemember / afterThink / onTaskComplete",
    "Durable": durableLive ? "live" : "offline (OK for judges)",
    "Seed synced": synced ? "yes" : "no (offline gate)",
    "Blob ref": promotedBlob,
  });
}
