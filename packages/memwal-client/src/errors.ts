/** Thrown when MemWal env / config is incomplete or invalid (ADR-002). */
export class MemWalConfigError extends Error {
  override readonly name = "MemWalConfigError";

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isMemWalConfigError(e: unknown): e is MemWalConfigError {
  return e instanceof MemWalConfigError;
}
