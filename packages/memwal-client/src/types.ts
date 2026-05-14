import type { ObjectId } from "@memwalpp/shared";

/** Outcome payload suitable for Sui `event::emit` (ADR-005) — map in Move + TS SDK. */
export interface OnChainOutcomeEvent {
  kind: "outcome_recorded";
  packId?: ObjectId;
  scoreDelta: number;
  proofDigest: string;
}

export interface HookContext {
  namespace: string;
  callerAddress?: string;
}
