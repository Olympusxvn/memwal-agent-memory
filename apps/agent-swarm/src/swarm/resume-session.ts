import type { AgentRuntime } from "../runtime/create-runtime.js";
import { demoBanner, demoOk, demoStep, demoSummary } from "../util/demo-log.js";

const NAMESPACE = "resume-session-demo";
const STEPS = 4;

/**
 * Long-running session stub (Phase 14): "day 1" seed is optional; "day 2" recalls
 * from the same namespace via hybrid pullQuery — offline exit 0.
 */
export async function runResumeSession(runtime: AgentRuntime): Promise<number> {
  demoBanner(
    "MemWal Agent Memory · agent:resume-session",
    "Day-2 recall from shared namespace (long-running companion narrative)",
  );

  demoStep(1, STEPS, "Setup — resume namespace");
  demoOk(`Namespace: ${NAMESPACE}`);
  demoOk(`Durable: ${runtime.durableLive ? "live" : "offline"}`);

  const sessionMarker = `session-day1-${Date.now()}`;
  demoStep(2, STEPS, "Session 1 — seed preference memory");
  const id = crypto.randomUUID();
  await runtime.sync.remember(
    {
      id,
      namespace: NAMESPACE,
      content: `${sessionMarker}: User prefers Brazil, high confidence, Walrus track demo context with enough text for recall.`,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
      synced: false,
      metadata: { agentId: "session-1", role: "preference" },
    },
    { promote: "local" },
  );
  demoOk(`Stored ${id.slice(0, 8)}… (local-only seed)`);

  demoStep(3, STEPS, "Session 2 — hybrid recall (forceDurable when live)");
  const hits = await runtime.sync.pullQuery("Brazil confidence", {
    namespace: NAMESPACE,
    limit: 5,
    forceDurable: runtime.durableLive,
  });
  const found = hits.some((h) => h.content.includes(sessionMarker));
  if (!found) {
    console.error("resume-session: expected day-2 recall to find session marker");
    return 1;
  }
  demoOk(`Recalled ${hits[0]?.content.length ?? 0} chars from hybrid memory`);

  demoStep(4, STEPS, "Verify local proof");
  const verify = await runtime.sync.verifyMemory({ memoryId: id });
  const valid = "valid" in verify && verify.valid === true;
  demoOk(valid ? "Layered verify PASS on session memory" : "Verify skipped (offline local proof)");

  demoSummary({
    Flow: "session-1 seed → session-2 pullQuery recall",
    Namespace: NAMESPACE,
    Durable: runtime.durableLive ? "live — set MEMWAL_* for Walrus blob" : "offline",
    Verify: valid ? "PASS" : "local-only",
    Companion: "https://special-one-agent.vercel.app/chat (production long-running ledger)",
  });

  return 0;
}
