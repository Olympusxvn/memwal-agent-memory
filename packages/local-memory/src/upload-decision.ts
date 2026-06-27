import { scoreQuality } from "./quality-scorer.js";

export type PromoteMode = "auto" | "local" | "walrus";

export interface UploadDecision {
  upload: boolean;
  reason: string;
  score: number;
  threshold: number;
  promoteMode: PromoteMode;
}

/** Resolve promote mode from remember options, metadata, or @walrus / @local tags. */
export function resolvePromoteMode(
  metadata?: Record<string, string>,
  content?: string,
  optsPromote?: PromoteMode,
): PromoteMode {
  if (optsPromote === "local" || optsPromote === "walrus" || optsPromote === "auto") {
    if (optsPromote !== "auto") return optsPromote;
  }
  const meta = metadata?.promoteMode ?? metadata?.promote;
  if (meta === "local" || meta === "walrus") return meta;
  const text = content ?? "";
  if (/\B@local\b/i.test(text)) return "local";
  if (/\B@walrus\b/i.test(text)) return "walrus";
  if (metadata?.important === "1" || metadata?.important === "true") return "walrus";
  return "auto";
}

/** Multi-factor upload score (v1) — extends length/word gate with metadata + access frequency. */
export function scoreUploadDecision(
  text: string,
  metadata?: Record<string, string>,
  accessCount = 0,
): number {
  let score = scoreQuality(text);
  if (metadata?.important === "1" || metadata?.important === "true") score += 15;
  if (metadata?.role?.startsWith("bounty-")) score += 10;
  if (metadata?.artifact === "true" || metadata?.artifact === "1") score += 8;
  if (accessCount > 5) score += Math.min(20, accessCount * 2);
  return Math.min(100, Math.max(0, score));
}

export function shouldUploadToWalrus(params: {
  score: number;
  threshold: number;
  promoteMode: PromoteMode;
}): UploadDecision {
  const { score, threshold, promoteMode } = params;
  if (promoteMode === "local") {
    return { upload: false, reason: "promote_local", score, threshold, promoteMode };
  }
  if (promoteMode === "walrus") {
    return { upload: true, reason: "promote_walrus", score, threshold, promoteMode };
  }
  if (score >= threshold) {
    return { upload: true, reason: "score_ok", score, threshold, promoteMode };
  }
  return { upload: false, reason: "gate", score, threshold, promoteMode };
}
