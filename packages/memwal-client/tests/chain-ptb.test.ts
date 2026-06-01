import { describe, expect, it } from "vitest";

import { loadChainConfigFromEnv } from "../src/chain/config.js";
import { buildPostBountyTx } from "../src/chain/ptb-builders.js";

describe("chain ptb builders", () => {
  it("builds v1 post_bounty with clock + treasury mint", () => {
    const config = loadChainConfigFromEnv({
      SUI_DELEGATE_PRIVATE_KEY: "0x".padEnd(66, "1"),
      MARKETPLACE_OBJECT_ID: "0x7dea19c34022cc7d28d21bfef75859bd6704f8fbd9bc7ea00c787052f895d548",
      WAL_TREASURY_CAP_ID: "0xb9ee4a8bab47624f8ec343fd079c51fb54be60a8671affc7961da6e45badc41e",
    });
    expect(config).not.toBeNull();
    const tx = buildPostBountyTx(config!, {
      amountMist: 1000n,
      deadlineMs: 999999999999n,
      description: "test bounty",
    });
    const json = tx.getData();
    expect(json.commands.length).toBeGreaterThanOrEqual(2);
  });
});
