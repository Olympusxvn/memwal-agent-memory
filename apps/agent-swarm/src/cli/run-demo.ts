#!/usr/bin/env node
import { createAgentRuntime } from "../runtime/create-runtime.js";
import { runAgentDemo } from "../swarm/demo.js";

try {
  const runtime = createAgentRuntime();
  await runAgentDemo(runtime);
  process.exit(0);
} catch (err) {
  console.error("agent:demo failed:", err instanceof Error ? err.message : err);
  process.exit(1);
}
