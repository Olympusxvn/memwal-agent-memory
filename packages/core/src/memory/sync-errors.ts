export type SyncErrorCode =
  | "NOT_FOUND"
  | "QUALITY_GATE"
  | "OFFLINE"
  | "TOMBSTONE"
  | "UPSTREAM_DISABLED"
  | "DURABLE_FAILED";

export class SyncError extends Error {
  readonly code: SyncErrorCode;

  constructor(code: SyncErrorCode, message: string) {
    super(message);
    this.name = "SyncError";
    this.code = code;
  }
}
