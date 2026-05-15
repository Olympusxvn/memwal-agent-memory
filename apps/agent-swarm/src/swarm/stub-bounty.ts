import type { ObjectId } from "@memwalpp/shared";

export const DEMO_BOUNTY_NAMESPACE = "bounty-demo";

export const DEMO_BOUNTY = {
  id: "0x0000000000000000000000000000000000000000000000000000000000000001" as ObjectId,
  title: "Improve Walrus verification narrative for judges",
  rewardWal: 100,
  namespace: DEMO_BOUNTY_NAMESPACE,
  requirement:
    "Bounty requires verifiable Walrus proof and MemWal durable recall. " +
    "Document how hybrid local-first memory promotes to encrypted blobs.",
} as const;
