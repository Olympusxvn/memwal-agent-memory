import { createAgentRuntime } from "../runtime/create-runtime.js";
import { runResumeSession } from "../swarm/resume-session.js";

try {
  const runtime = createAgentRuntime({ namespace: "resume-session-demo" });
  const code = await runResumeSession(runtime);
  process.exit(code);
} catch (err) {
  console.error("agent:resume-session failed:", err instanceof Error ? err.message : err);
  process.exit(1);
}
