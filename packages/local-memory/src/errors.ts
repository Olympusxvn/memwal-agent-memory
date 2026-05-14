export type LocalMemoryErrorCode = "VALIDATION" | "OPEN" | "SQL" | "CORRUPT_ROW";

export class LocalMemoryError extends Error {
  readonly code: LocalMemoryErrorCode;

  constructor(code: LocalMemoryErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "LocalMemoryError";
    this.code = code;
  }
}

export class SqliteLocalStoreError extends LocalMemoryError {
  constructor(
    code: Extract<LocalMemoryErrorCode, "OPEN" | "SQL" | "CORRUPT_ROW">,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(code, message, options);
    this.name = "SqliteLocalStoreError";
  }
}
