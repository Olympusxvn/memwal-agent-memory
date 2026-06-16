import { describe, expect, it } from "vitest";

import {
  collectSubmissionBlobIds,
  extractIdVector,
  extractOptionId,
  normalizeObjectId,
} from "../src/chain/chain-reader.js";

describe("chain-reader field parsing (1.1c)", () => {
  it("normalizeObjectId accepts plain and nested ids", () => {
    expect(normalizeObjectId("0xabc")).toBe("0xabc");
    expect(normalizeObjectId({ id: "0xdef" })).toBe("0xdef");
    expect(normalizeObjectId("not-an-id")).toBeUndefined();
  });

  it("extractIdVector reads blob_ids vector", () => {
    expect(extractIdVector(["0xa", "0xb"])).toEqual(["0xa", "0xb"]);
    expect(extractIdVector([{ id: "0xc" }])).toEqual(["0xc"]);
  });

  it("extractOptionId reads Option Some", () => {
    expect(extractOptionId({ Some: "0xf1" })).toBe("0xf1");
    expect(extractOptionId({ some: "0xf2" })).toBe("0xf2");
    expect(extractOptionId(null)).toBeUndefined();
  });

  it("collectSubmissionBlobIds reads BountyV2 submissions", () => {
    const ids = collectSubmissionBlobIds([
      { fields: { walrus_blob_id: "0xb1" } },
      { walrus_blob_id: "0xb2" },
    ]);
    expect(ids).toEqual(["0xb1", "0xb2"]);
  });
});
