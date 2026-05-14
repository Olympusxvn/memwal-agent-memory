/** 32-byte Sui object id, `0x` + 64 hex (normalized lowercase in this codebase). */
export type ObjectId = `0x${string}`;

/** Sui address — same shape as ObjectId in practice; kept separate for semantics. */
export type SuiAddress = `0x${string}`;

export function isObjectId(value: string): value is ObjectId {
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}
