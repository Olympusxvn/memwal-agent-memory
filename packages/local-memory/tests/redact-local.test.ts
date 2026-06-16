import { describe, expect, it } from "vitest";

import { InMemoryLocalMemoryStore } from "../src/store/in-memory-store.js";
import { MEMORY_METADATA_KEYS } from "@memwalpp/shared";

describe("remember redactLocal option", () => {
  it("redactLocal false (default) stores raw content", async () => {
    const store = new InMemoryLocalMemoryStore();
    const email = "user@example.com";
    await store.remember(
      {
        id: "r1",
        namespace: "default",
        content: `contact ${email} with enough text for later sync.`,
        createdAtMs: 1,
        updatedAtMs: 1,
        synced: false,
      },
      { redactLocal: false },
    );
    const row = await store.getById("r1");
    expect(row?.content).toContain(email);
    expect(row?.metadata?.[MEMORY_METADATA_KEYS.redactLocal]).toBeUndefined();
  });

  it("redactLocal true redacts before SQLite/in-memory persist", async () => {
    const store = new InMemoryLocalMemoryStore();
    const email = "user@example.com";
    await store.remember(
      {
        id: "r2",
        namespace: "default",
        content: `contact ${email} with enough text for local privacy mode.`,
        createdAtMs: 1,
        updatedAtMs: 1,
        synced: false,
      },
      { redactLocal: true },
    );
    const row = await store.getById("r2");
    expect(row?.content).not.toContain(email);
    expect(row?.content).toContain("[redacted-email]");
    expect(row?.metadata?.[MEMORY_METADATA_KEYS.redactLocal]).toBe("1");
    expect(row?.metadata?.[MEMORY_METADATA_KEYS.redacted]).toBe("1");
  });
});
