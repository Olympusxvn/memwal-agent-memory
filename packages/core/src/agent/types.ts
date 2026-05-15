import type { HookContext } from "@memwalpp/memwal-client";
import type { ObjectId } from "@memwalpp/shared";

/** Agent-swarm hook context (extends memwal-client HookContext). */
export interface SwarmHookContext extends HookContext {
  agentId: string;
  taskId?: string;
  bountyId?: string;
  packId?: ObjectId;
  /** Last memory row written in afterThink (for onTaskComplete push). */
  lastMemoryId?: string;
}

export interface AgentBridgeConfig {
  recallLimit?: number;
  /** Max injected context characters (default 2000). */
  maxContextChars?: number;
  /** When true, afterThink calls sync.pushOne (redact + gate inside sync). */
  autoPushAfterThink?: boolean;
  defaultNamespace?: string;
  demoMaxContentChars?: number;
}
