import { toOutcomeEvent } from "@memwalpp/core";
import type { ObjectId } from "@memwalpp/shared";

const DEMO_PACK: ObjectId =
  "0x0000000000000000000000000000000000000000000000000000000000000001" as ObjectId;

console.log(
  "agent-swarm placeholder — wire OpenClaw/NemoClaw; outcome stub:",
  toOutcomeEvent({ packId: DEMO_PACK, scoreDelta: 1, proofDigest: "demo" }),
);
