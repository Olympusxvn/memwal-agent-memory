import { createHash } from "node:crypto";

export function descriptionHashBytes(description: string): number[] {
  return [...createHash("sha256").update(description, "utf8").digest()];
}

export function walrusBlobIdFromString(blobId: string): string {
  const trimmed = blobId.trim();
  if (trimmed.startsWith("0x") && trimmed.length === 66) return trimmed;
  const hex = createHash("sha256").update(trimmed, "utf8").digest("hex").slice(0, 64);
  return `0x${hex}`;
}
