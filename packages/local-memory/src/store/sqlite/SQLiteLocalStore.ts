import SqliteDatabase from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import type { MemoryRecord, ObjectId, RememberOptions } from "@memwalpp/shared";

import { shouldUseFtsRecall, toFtsMatchExpression } from "../../fts-recall.js";
import { SqliteLocalStoreError } from "../../errors.js";
import {
  LocalMemoryStore,
  type PruneParams,
  type RecallParams,
} from "../LocalMemoryStore.js";

const SCHEMA_VERSION = 2;

const DDL = `
CREATE TABLE IF NOT EXISTS memory_records (
  id TEXT PRIMARY KEY NOT NULL,
  namespace TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  walrus_blob_id TEXT,
  synced INTEGER NOT NULL DEFAULT 0,
  local_quality_score REAL,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_memory_namespace_updated
  ON memory_records(namespace, updated_at_ms DESC);
`;

const FTS_DDL = `
CREATE VIRTUAL TABLE IF NOT EXISTS memory_records_fts USING fts5(
  content,
  content='memory_records',
  content_rowid='rowid'
);
CREATE TRIGGER IF NOT EXISTS memory_records_ai AFTER INSERT ON memory_records BEGIN
  INSERT INTO memory_records_fts(rowid, content) VALUES (new.rowid, new.content);
END;
CREATE TRIGGER IF NOT EXISTS memory_records_ad AFTER DELETE ON memory_records BEGIN
  INSERT INTO memory_records_fts(memory_records_fts, rowid, content) VALUES('delete', old.rowid, old.content);
END;
CREATE TRIGGER IF NOT EXISTS memory_records_au AFTER UPDATE ON memory_records BEGIN
  INSERT INTO memory_records_fts(memory_records_fts, rowid, content) VALUES('delete', old.rowid, old.content);
  INSERT INTO memory_records_fts(rowid, content) VALUES (new.rowid, new.content);
END;
`;

export interface SQLiteLocalStoreOptions {
  /** When true, opening fails if the file does not exist. */
  fileMustExist?: boolean;
}

export class SqliteLocalStore extends LocalMemoryStore {
  private readonly db: SqliteDatabase.Database;

  constructor(dbPath: string, options?: SQLiteLocalStoreOptions) {
    super();
    const resolved =
      dbPath === ":memory:" || dbPath === "file::memory:"
        ? ":memory:"
        : path.resolve(dbPath);
    if (resolved !== ":memory:") {
      fs.mkdirSync(path.dirname(resolved), { recursive: true });
    }

    try {
      this.db = new SqliteDatabase(resolved, { fileMustExist: options?.fileMustExist ?? false });
    } catch (e) {
      throw new SqliteLocalStoreError("OPEN", `Cannot open SQLite database at ${resolved}`, {
        cause: e,
      });
    }

    try {
      this.db.pragma("journal_mode = WAL");
      this.db.pragma("foreign_keys = ON");
      this.initSchema();
    } catch (e) {
      try {
        this.db.close();
      } catch {
        /* ignore */
      }
      throw new SqliteLocalStoreError("SQL", "Failed to initialize SQLite schema", { cause: e });
    }
  }

  close(): void {
    this.db.close();
  }

  private initSchema(): void {
    this.db.exec(DDL);
    const hasVersion = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='_schema_version'")
      .get() as { name: string } | undefined;
    if (!hasVersion) {
      this.db.exec(`CREATE TABLE _schema_version (version INTEGER NOT NULL);`);
      this.db.prepare(`INSERT INTO _schema_version (version) VALUES (?)`).run(SCHEMA_VERSION);
      this.ensureFtsSchema();
      return;
    }
    const v = this.db.prepare(`SELECT version FROM _schema_version LIMIT 1`).get() as
      | { version: number }
      | undefined;
    const current = v?.version ?? 0;
    if (current === 1) {
      this.ensureFtsSchema();
      this.db.prepare(`UPDATE _schema_version SET version = ?`).run(SCHEMA_VERSION);
      return;
    }
    if (current !== SCHEMA_VERSION) {
      throw new SqliteLocalStoreError(
        "SQL",
        `Unsupported SQLite schema version (expected ${SCHEMA_VERSION}, got ${String(current)})`,
      );
    }
    this.ensureFtsSchema();
  }

  private ensureFtsSchema(): void {
    this.db.exec(FTS_DDL);
    const ftsCount = this.db.prepare(`SELECT COUNT(*) as c FROM memory_records_fts`).get() as {
      c: number;
    };
    const rowCount = this.db.prepare(`SELECT COUNT(*) as c FROM memory_records`).get() as {
      c: number;
    };
    if (Number(rowCount.c) > 0 && Number(ftsCount.c) === 0) {
      this.db.exec(
        `INSERT INTO memory_records_fts(rowid, content) SELECT rowid, content FROM memory_records`,
      );
    }
  }

  async remember(record: MemoryRecord, opts?: RememberOptions): Promise<void> {
    LocalMemoryStore.assertNonEmptyId(record.id);
    LocalMemoryStore.assertNonEmptyNamespace(record.namespace);
    const row = this.prepareRememberRecord(record, opts);
    const metadataJson = JSON.stringify(row.metadata ?? {});
    const syncedInt = row.synced ? 1 : 0;
    const walrus = row.walrusBlobId ?? null;
    const score = row.localQualityScore ?? null;
    try {
      this.db
        .prepare(
          `INSERT INTO memory_records (
            id, namespace, content, created_at_ms, updated_at_ms,
            walrus_blob_id, synced, local_quality_score, metadata_json
          ) VALUES (@id, @namespace, @content, @created_at_ms, @updated_at_ms,
            @walrus_blob_id, @synced, @local_quality_score, @metadata_json)
          ON CONFLICT(id) DO UPDATE SET
            namespace = excluded.namespace,
            content = excluded.content,
            created_at_ms = excluded.created_at_ms,
            updated_at_ms = excluded.updated_at_ms,
            walrus_blob_id = excluded.walrus_blob_id,
            synced = excluded.synced,
            local_quality_score = excluded.local_quality_score,
            metadata_json = excluded.metadata_json`,
        )
        .run({
          id: row.id,
          namespace: row.namespace,
          content: row.content,
          created_at_ms: row.createdAtMs,
          updated_at_ms: row.updatedAtMs,
          walrus_blob_id: walrus,
          synced: syncedInt,
          local_quality_score: score,
          metadata_json: metadataJson,
        });
    } catch (e) {
      throw new SqliteLocalStoreError("SQL", "remember failed", { cause: e });
    }
  }

  async getById(id: string): Promise<MemoryRecord | undefined> {
    if (!id.trim()) return undefined;
    try {
      const row = this.db.prepare("SELECT * FROM memory_records WHERE id = ?").get(id) as
        | Record<string, unknown>
        | undefined;
      return row ? this.rowToRecord(row) : undefined;
    } catch (e) {
      throw new SqliteLocalStoreError("SQL", "getById failed", { cause: e });
    }
  }

  async recall(params: RecallParams): Promise<MemoryRecord[]> {
    LocalMemoryStore.assertNonEmptyNamespace(params.namespace);
    const limit = LocalMemoryStore.clampRecallLimit(params.limit);
    const q = params.query.trim();
    const useFts = shouldUseFtsRecall(q, params.searchMode ?? "auto");
    try {
      if (q && useFts) {
        const match = toFtsMatchExpression(q);
        if (match) {
          const rows = this.db
            .prepare(
              `SELECT mr.* FROM memory_records mr
               INNER JOIN memory_records_fts fts ON mr.rowid = fts.rowid
               WHERE mr.namespace = ? AND memory_records_fts MATCH ?
               ORDER BY mr.updated_at_ms DESC
               LIMIT ?`,
            )
            .all(params.namespace, match, limit) as Record<string, unknown>[];
          return rows.map((r) => this.rowToRecord(r));
        }
      }

      const rows = q
        ? (this.db
            .prepare(
              `SELECT * FROM memory_records
               WHERE namespace = ?
                 AND INSTR(LOWER(content), LOWER(?)) > 0
               ORDER BY updated_at_ms DESC
               LIMIT ?`,
            )
            .all(params.namespace, q, limit) as Record<string, unknown>[])
        : (this.db
            .prepare(
              `SELECT * FROM memory_records
               WHERE namespace = ?
               ORDER BY updated_at_ms DESC
               LIMIT ?`,
            )
            .all(params.namespace, limit) as Record<string, unknown>[]);
      return rows.map((r) => this.rowToRecord(r));
    } catch (e) {
      throw new SqliteLocalStoreError("SQL", "recall failed", { cause: e });
    }
  }

  async prune(params: PruneParams): Promise<number> {
    let deleted = 0;
    const ns = params.namespace?.trim();

    if (params.olderThanMs != null) {
      const threshold = params.olderThanMs;
      try {
        const info = ns
          ? this.db
              .prepare(
                `DELETE FROM memory_records WHERE updated_at_ms < ? AND namespace = ?`,
              )
              .run(threshold, ns)
          : this.db.prepare(`DELETE FROM memory_records WHERE updated_at_ms < ?`).run(threshold);
        deleted += Number(info.changes ?? 0);
      } catch (e) {
        throw new SqliteLocalStoreError("SQL", "prune (olderThanMs) failed", { cause: e });
      }
    }

    if (params.keepLatest != null && params.keepLatest >= 0) {
      deleted += this.pruneKeepLatest(params.keepLatest, ns);
    }

    return deleted;
  }

  private pruneKeepLatest(keepLatest: number, namespace?: string): number {
    try {
      const countRow = namespace
        ? (this.db.prepare(`SELECT COUNT(*) as c FROM memory_records WHERE namespace = ?`).get(namespace) as {
            c: number;
          })
        : (this.db.prepare(`SELECT COUNT(*) as c FROM memory_records`).get() as { c: number });
      const count = Number(countRow.c);
      const excess = count - keepLatest;
      if (excess <= 0) return 0;
      const info = namespace
        ? this.db
            .prepare(
              `DELETE FROM memory_records WHERE id IN (
                SELECT id FROM memory_records WHERE namespace = ?
                ORDER BY updated_at_ms ASC LIMIT ?)`,
            )
            .run(namespace, excess)
        : this.db
            .prepare(
              `DELETE FROM memory_records WHERE id IN (
                SELECT id FROM memory_records ORDER BY updated_at_ms ASC LIMIT ?)`,
            )
            .run(excess);
      return Number(info.changes ?? 0);
    } catch (e) {
      throw new SqliteLocalStoreError("SQL", "prune (keepLatest) failed", { cause: e });
    }
  }

  private rowToRecord(row: Record<string, unknown>): MemoryRecord {
    let metadata: Record<string, string> | undefined;
    try {
      const raw = String(row.metadata_json ?? "{}");
      const obj = JSON.parse(raw) as Record<string, unknown>;
      metadata = Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, String(v)]));
    } catch (e) {
      throw new SqliteLocalStoreError("CORRUPT_ROW", "Invalid metadata_json for row", { cause: e });
    }

    const wal = row.walrus_blob_id;
    const walrusBlobId =
      wal != null && String(wal).length > 0 ? (String(wal) as ObjectId) : undefined;

    return {
      id: String(row.id),
      namespace: String(row.namespace),
      content: String(row.content),
      createdAtMs: Number(row.created_at_ms),
      updatedAtMs: Number(row.updated_at_ms),
      walrusBlobId,
      synced: Boolean(row.synced),
      localQualityScore:
        row.local_quality_score == null || row.local_quality_score === ""
          ? undefined
          : Number(row.local_quality_score),
      metadata,
    };
  }
}
