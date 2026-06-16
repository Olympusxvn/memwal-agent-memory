import { describe, expect, it } from "vitest";

import { packLineageFromParsed, parsePackExtLineage } from "../src/chain/chain-reader.js";

describe("chain-reader pack lineage (1.1d)", () => {
  it("parsePackExtLineage reads memory_ext Lineage fields", () => {
    const parsed = parsePackExtLineage({
      fields: {
        version: 2,
        lineage: {
          fields: {
            parent: { Some: "0xparent" },
            root: { Some: "0xroot" },
            fork_depth: 1,
            ancestors: ["0xabc", "0xdef"],
          },
        },
      },
    });
    expect(parsed?.parentPackId).toBe("0xparent");
    expect(parsed?.rootPackId).toBe("0xroot");
    expect(parsed?.forkDepth).toBe(1);
    expect(parsed?.ancestors).toEqual(["0xabc", "0xdef"]);
    expect(parsed?.version).toBe(2);
  });

  it("packLineageFromParsed defaults when ext missing", () => {
    const result = packLineageFromParsed("0xpack1", null);
    expect(result.checked).toBe(true);
    expect(result.packId).toBe("0xpack1");
    expect(result.reasons).toContain("pack_ext_not_found");
    expect(result.forkDepth).toBe(0);
  });
});
