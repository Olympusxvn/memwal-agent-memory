/** Thrown when MemWal env / config is incomplete or invalid (ADR-002). */
export class MemWalConfigError extends Error {
  override readonly name = "MemWalConfigError";

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class MemWalAuthError extends Error {
  override readonly name = "MemWalAuthError";
  readonly statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class MemWalTransportError extends Error {
  override readonly name = "MemWalTransportError";
  readonly statusCode?: number;
  readonly cause?: unknown;

  constructor(message: string, options?: { statusCode?: number; cause?: unknown }) {
    super(message);
    this.statusCode = options?.statusCode;
    this.cause = options?.cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class MemWalRateLimitError extends Error {
  override readonly name = "MemWalRateLimitError";
  readonly statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isMemWalConfigError(e: unknown): e is MemWalConfigError {
  return e instanceof MemWalConfigError;
}

export function isMemWalAuthError(e: unknown): e is MemWalAuthError {
  return e instanceof MemWalAuthError;
}

export function isMemWalTransportError(e: unknown): e is MemWalTransportError {
  return e instanceof MemWalTransportError;
}

/** Map fetch / SDK errors into retryable transport errors. */
export function wrapMemWalCallError(e: unknown): Error {
  if (
    e instanceof MemWalConfigError ||
    e instanceof MemWalAuthError ||
    e instanceof MemWalTransportError
  ) {
    return e;
  }
  const status = extractStatusCode(e);
  if (status === 401 || status === 403) {
    return new MemWalAuthError(`MemWal auth failed (${status})`, status);
  }
  if (status === 429) {
    return new MemWalRateLimitError("MemWal rate limited (429)", 429);
  }
  if (status != null && status >= 500) {
    return new MemWalTransportError(`MemWal server error (${status})`, { statusCode: status, cause: e });
  }
  if (isNetworkError(e)) {
    return new MemWalTransportError("MemWal network error", { cause: e });
  }
  if (e instanceof Error) {
    return e;
  }
  return new MemWalTransportError("MemWal request failed", { cause: e });
}

function extractStatusCode(e: unknown): number | undefined {
  if (e && typeof e === "object" && "status" in e && typeof (e as { status: unknown }).status === "number") {
    return (e as { status: number }).status;
  }
  if (e && typeof e === "object" && "statusCode" in e) {
    const sc = (e as { statusCode: unknown }).statusCode;
    if (typeof sc === "number") return sc;
  }
  return undefined;
}

function isNetworkError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const msg = e.message.toLowerCase();
  return (
    msg.includes("fetch") ||
    msg.includes("network") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    e.name === "TypeError"
  );
}

export function shouldRetryMemWalError(e: unknown): boolean {
  if (e instanceof MemWalAuthError || e instanceof MemWalConfigError) return false;
  if (e instanceof MemWalRateLimitError || e instanceof MemWalTransportError) return true;
  return false;
}
