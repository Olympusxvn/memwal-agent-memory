import type { MemoryNamespace } from "./memory.js";
import type { ObjectId, SuiAddress } from "./sui.js";

/** High-level agent intents for logging, hooks, and demo scripts. */
export type AgentActionKind =
  | "hook_before"
  | "hook_after"
  | "save_memory"
  | "query_memory"
  | "export_pack"
  | "import_pack"
  | "list_pack"
  | "buy_pack"
  | "post_bounty"
  | "submit_fulfillment"
  | "approve_bounty"
  | "scan_bounties";

export interface AgentAction {
  kind: AgentActionKind;
  atMs: number;
  namespace?: MemoryNamespace;
  /** Optional on-chain correlation. */
  txDigest?: string;
  packId?: ObjectId;
  bountyId?: ObjectId;
  actor?: SuiAddress;
  payload?: Record<string, unknown>;
}

/** Role taxonomy for swarm demos (orchestration layer). */
export type AgentRole = "contributor" | "bounty_hunter" | "evaluator" | "seller" | "buyer";

export interface AgentIdentity {
  role: AgentRole;
  address: SuiAddress;
  label?: string;
}
