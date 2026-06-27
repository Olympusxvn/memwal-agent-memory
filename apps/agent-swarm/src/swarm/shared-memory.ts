import type { SwarmHookContext } from "@memwalpp/core";
import type { MemoryRecord } from "@memwalpp/shared";

import type { AgentRuntime } from "../runtime/create-runtime.js";
import {
  demoAgentTable,
  type AgentMemoryRow,
  demoBanner,
  demoInfo,
  demoOk,
  demoSkip,
  demoStep,
  demoSummary,
} from "../util/demo-log.js";

const NAMESPACE = "shared-memory-demo";
const STEPS = 8;

async function saveAgentMemory(
  runtime: AgentRuntime,
  content: string,
  metadata: Record<string, string>,
): Promise<string> {
  const now = Date.now();
  const id = crypto.randomUUID();
  const record: MemoryRecord = {
    id,
    namespace: NAMESPACE,
    content: content.trim(),
    createdAtMs: now,
    updatedAtMs: now,
    synced: false,
    metadata,
  };
  await runtime.sync.remember(record, { promote: "auto" });
  return id;
}

async function pushAndTrack(
  runtime: AgentRuntime,
  agentId: string,
  memoryId: string,
  rows: AgentMemoryRow[],
): Promise<string> {
  const push = await runtime.sync.pushOne(memoryId, { namespace: NAMESPACE });
  const row = await runtime.local.getById(memoryId);
  const blob = push.pushed ? (push.blobId ?? row?.walrusBlobId ?? "—") : "—";
  const hitSource = row?.synced && row.walrusBlobId ? "local+durable" : "local";
  rows.push({
    agentId,
    memoryId,
    walrusBlobId: blob,
    hitSource: push.pushed ? "hybrid" : hitSource,
  });
  if (push.pushed) {
    demoOk(`Promoted — blob ${blob}`);
  } else {
    demoSkip(`Skipped (${push.reason ?? "unknown"})`);
  }
  return blob;
}

export async function runSharedMemory(runtime: AgentRuntime): Promise<void> {
  const { bridge, sync, durableLive, storeKind } = runtime;
  const agentRows: AgentMemoryRow[] = [];

  demoBanner(
    "MemWal Agent Memory · agent:shared-memory",
    "Three-agent swarm: Research → Analyst → Executor share Walrus namespace",
  );

  demoStep(1, STEPS, "Setup — shared namespace on Walrus track demo");
  demoInfo("Namespace", NAMESPACE);
  demoInfo("Store", storeKind === "sqlite" ? "SQLite" : "in-memory");
  demoInfo("Durable", durableLive ? "live" : "offline");

  demoStep(2, STEPS, "Agent: Research — seed findings + JSON artifact report");
  const researchId = await saveAgentMemory(
    runtime,
    "[RESEARCH] Walrus verification patterns for hybrid agent memory:\n" +
      "1) promote redacted rows via MemorySyncService\n" +
      "2) share namespace across agents\n" +
      "3) attach walrusBlobId for bounty fulfillment",
    { role: "agent-research", agentId: "agent-research" },
  );
  const artifactPayload = JSON.stringify(
    {
      report: "walrus-verification",
      findings: ["hybrid sync", "layered verify", "shared namespace"],
      generatedBy: "agent-research",
    },
    null,
    2,
  );
  const artifactId = await saveAgentMemory(
    runtime,
    `# Artifact: walrus-verification-report\n\n${artifactPayload}`,
    {
      role: "agent-research",
      agentId: "agent-research",
      artifact: "true",
      artifactName: "walrus-verification-report",
      artifactMime: "application/json",
    },
  );
  demoOk(`Research memory ${researchId}`);
  demoOk(`Artifact report ${artifactId.slice(0, 8)}… (metadata artifact: true)`);

  demoStep(3, STEPS, "Research — pushOne findings + artifact (redact → MemWal → Walrus)");
  await pushAndTrack(runtime, "agent-research", researchId, agentRows);
  await pushAndTrack(runtime, "agent-research", artifactId, agentRows);

  const analystCtx: SwarmHookContext = {
    namespace: NAMESPACE,
    agentId: "agent-analyst",
    taskId: "synthesize-findings",
  };

  demoStep(4, STEPS, "Agent: Analyst — beforeRemember (hybrid pullQuery, forceDurable)");
  const analystPrompt = "Synthesize Walrus verification research for the executor agent.";
  const withResearch = await bridge.beforeRemember(analystCtx, analystPrompt);
  const injectedResearch = withResearch.length - analystPrompt.length;
  demoOk(
    injectedResearch > 0
      ? `Injected ${injectedResearch} chars from shared hybrid memory`
      : "Recall local-only (research row still local)",
  );
  const artifactHits = await sync.pullQuery("walrus-verification-report", {
    namespace: NAMESPACE,
    limit: 5,
    forceDurable: durableLive,
  });
  const artifactHit = artifactHits.find((h) => h.metadata?.artifact === "true");
  demoOk(
    artifactHit
      ? `Analyst recalled artifact "${artifactHit.metadata?.artifactName ?? "report"}"`
      : "Artifact recall local-only",
  );

  demoStep(5, STEPS, "Agent: Analyst — capture synthesis + push");
  const analystContent =
    "[ANALYSIS] Executor should verify layered proofs: local contentHash, " +
    "optional Walrus blob check, and Move bounty walrus_blob_id when live.";
  await bridge.afterThink(analystCtx, analystContent);
  const analystId = analystCtx.lastMemoryId;
  if (analystId) {
    await pushAndTrack(runtime, "agent-analyst", analystId, agentRows);
  } else {
    demoSkip("Analyst memory id missing");
  }

  const executorCtx: SwarmHookContext = {
    namespace: NAMESPACE,
    agentId: "agent-executor",
    taskId: "fulfill-plan",
  };

  demoStep(6, STEPS, "Agent: Executor — recall research + analysis context");
  const executorPrompt = "Execute the Walrus verification plan from shared memory.";
  const withPlan = await bridge.beforeRemember(executorCtx, executorPrompt);
  const injectedPlan = withPlan.length - executorPrompt.length;
  demoOk(
    injectedPlan > 0
      ? `Injected ${injectedPlan} chars from prior agents`
      : "Executor recall local-only",
  );

  demoStep(7, STEPS, "Agent: Executor — onTaskComplete (syncPending)");
  await bridge.onTaskComplete(executorCtx, "Shared-memory workflow complete — verify proofs next.");
  demoOk("syncPending emitted");

  demoStep(8, STEPS, "Verify — export pack + agent table");
  const exported = await bridge.exportPack();
  demoOk(`${exported.blobIds.length} durable blob id(s) in pack export`);
  demoAgentTable(agentRows);

  const verify = await sync.verifyMemory({ memoryId: researchId });
  demoOk(verify.valid ? "Layered verify PASS on research memory" : "Verify local-only (offline OK)");

  demoSummary({
    Agents: "research + analyst + executor",
    Flow: "research → push → analyst recall → push → executor recall → sync",
    Walrus: durableLive ? `${exported.blobIds.length} blob ref(s)` : "offline — set MEMWAL_*",
    Verify: verify.valid ? "PASS" : "local-only",
    Artifact: artifactHit ? "recalled by analyst" : "local-only",
  });
}
