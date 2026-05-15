import type { MemoryRecord } from "@memwalpp/shared";

export interface RememberOpts {
  namespace?: string;
  /** When true, block until blob id is known (overrides client default). */
  wait?: boolean;
}

export interface RecallOpts {
  namespace?: string;
  limit?: number;
}

export interface NamespaceOpts {
  namespace?: string;
}

export interface MemoryVersion {
  version: string;
  blobId?: string;
  jobId?: string;
  promotedAtMs?: number;
  source: "durable" | "metadata";
}

export interface DurableRememberResult {
  recordId: string;
  jobId?: string;
  blobId?: string;
  namespace: string;
}

export interface DurableRecallHit {
  text: string;
  blobId?: string;
  distance?: number;
  metadata?: Record<string, string>;
}

export interface DurableMemoryStore {
  readonly isLive: boolean;

  remember(record: MemoryRecord, opts?: RememberOpts): Promise<DurableRememberResult>;
  recall(query: string, opts?: RecallOpts): Promise<DurableRecallHit[]>;
  search(query: string, opts?: RecallOpts): Promise<DurableRecallHit[]>;
  delete(recordId: string, opts?: NamespaceOpts): Promise<void>;
  listVersions(recordId: string, opts?: NamespaceOpts): Promise<MemoryVersion[]>;

  health(): Promise<{ ok: boolean; version?: string }>;
  destroy(): void;
}
