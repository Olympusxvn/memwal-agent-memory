import { createRequire } from "node:module";
import { expect, it } from "vitest";

const require = createRequire(import.meta.url);

function sqliteNativeAvailable(): boolean {
  try {
    const SqliteDatabase: typeof import("better-sqlite3").default = require("better-sqlite3");
    const d = new SqliteDatabase(":memory:");
    d.close();
    return true;
  } catch {
    return false;
  }
}

it("logs when SQLite native bindings are missing (optional for dev)", () => {
  if (!sqliteNativeAvailable()) {
    // eslint-disable-next-line no-console
    console.warn(
      "[@memwalpp/local-memory] SQLite tests skipped: run `pnpm rebuild better-sqlite3` (see docs/CLAUDE.md).",
    );
  }
  expect(true).toBe(true);
});
