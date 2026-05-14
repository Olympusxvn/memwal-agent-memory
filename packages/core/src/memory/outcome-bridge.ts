import type { OnChainOutcomeEvent } from "@memwalpp/memwal-client";
import type { ObjectId } from "@memwalpp/shared";

/** Bridge local analytics → chain-emitted outcome shape (ADR-005). */
export function toOutcomeEvent(input: {
  packId: ObjectId;
  scoreDelta: number;
  proofDigest: string;
}): OnChainOutcomeEvent {
  return {
    kind: "outcome_recorded",
    packId: input.packId,
    scoreDelta: input.scoreDelta,
    proofDigest: input.proofDigest,
  };
}
