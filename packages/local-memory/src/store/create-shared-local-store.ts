import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

import type { LocalMemoryStore } from "./LocalMemoryStore.js";
import { InMemoryLocalMemoryStore } from "./in-memory-store.js";
import { SqliteLocalStore } from "./sqlite/SQLiteLocalStore.js";

const require = createRequire(import.meta.url);

/** True when the optional `better-sqlite3` native binding can be loaded. */
export function sqliteNativeAvailable(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("better-sqlite3");
    return true;
  } catch {
    return false;
  }
}

export interface CreateSharedLocalStoreOptions {
  /** Force the in-memory store regardless of SQLite availability. */
  forceMemory?: boolean;
  /** Base directory for the SQLite db file (default: `os.tmpdir()/memwalpp-runtime`). */
  baseDir?: string;
}

export interface SharedLocalStore {
  store: LocalMemoryStore;
  kind: "sqlite" | "memory";
}

/**
 * Prefer on-disk SQLite, fall back to in-memory when the native binding is
 * missing (or `forceMemory`). Shared by the agent-swarm and MCP runtimes so the
 * SQLite-gate + fallback logic lives in one place.
 */
export function createSharedLocalStore(
  namespace: string,
  options: CreateSharedLocalStoreOptions = {},
): SharedLocalStore {
  if (options.forceMemory || !sqliteNativeAvailable()) {
    return { store: new InMemoryLocalMemoryStore(), kind: "memory" };
  }

  const baseDir = options.baseDir ?? path.join(os.tmpdir(), "memwalpp-runtime");
  fs.mkdirSync(baseDir, { recursive: true });
  const dbPath = path.join(baseDir, `${namespace.replace(/[^a-z0-9-_]/gi, "_")}.db`);

  try {
    return { store: new SqliteLocalStore(dbPath), kind: "sqlite" };
  } catch {
    return { store: new InMemoryLocalMemoryStore(), kind: "memory" };
  }
}
