#!/usr/bin/env node
import { createAgentRuntime } from "../runtime/create-runtime.js";
import { DEMO_BOUNTY_NAMESPACE } from "../swarm/stub-bounty.js";
import { runBountyHunt } from "../swarm/bounty-hunt.js";

try {
  const runtime = createAgentRuntime({
    namespace: DEMO_BOUNTY_NAMESPACE,
    autoPushAfterThink: process.env.MEMWAL_AUTO_PUSH?.trim() === "1",
  });
  await runBountyHunt(runtime);
  process.exit(0);
} catch (err) {
  console.error("agent:bounty-hunt failed:", err instanceof Error ? err.message : err);
  process.exit(1);
}
