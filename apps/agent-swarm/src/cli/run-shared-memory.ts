import { createAgentRuntime } from "../runtime/create-runtime.js";
import { runSharedMemory } from "../swarm/shared-memory.js";

try {
  const runtime = createAgentRuntime({ namespace: "shared-memory-demo" });
  await runSharedMemory(runtime);
} catch (err) {
  console.error("agent:shared-memory failed:", err instanceof Error ? err.message : err);
  process.exit(1);
}
