import { getJsonRpcFullnodeUrl, SuiJsonRpcClient } from "@mysten/sui/jsonRpc";

import type {
  ChainReader,
  ChainReaderConfig,
  OnChainVerifyInput,
  OnChainVerifyResult,
  PackLineageResult,
} from "./chain-reader-types.js";
import { offlineOnChainResult } from "./chain-reader-types.js";
import type { SuiNetwork } from "./config.js";

function fullnodeUrl(network: SuiNetwork): string {
  if (network === "localnet") return getJsonRpcFullnodeUrl("localnet");
  return getJsonRpcFullnodeUrl(network);
}

export function normalizeObjectId(value: unknown): string | undefined {
  if (typeof value === "string" && value.startsWith("0x")) return value;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.id === "string" && obj.id.startsWith("0x")) return obj.id;
  }
  return undefined;
}

export function extractIdVector(field: unknown): string[] {
  if (!Array.isArray(field)) return [];
  const out: string[] = [];
  for (const item of field) {
    const id = normalizeObjectId(item);
    if (id) out.push(id);
  }
  return out;
}

export function extractOptionId(field: unknown): string | undefined {
  if (field == null) return undefined;
  if (typeof field === "string") return normalizeObjectId(field);
  if (typeof field !== "object") return undefined;
  const obj = field as Record<string, unknown>;
  if ("Some" in obj) return normalizeObjectId(obj.Some);
  if ("some" in obj) return normalizeObjectId(obj.some);
  if (Array.isArray(obj.fields)) {
    const inner = obj.fields[0];
    if (inner == null) return undefined;
    return normalizeObjectId(inner);
  }
  return normalizeObjectId(field);
}

export function collectSubmissionBlobIds(submissions: unknown): string[] {
  if (!Array.isArray(submissions)) return [];
  const out: string[] = [];
  for (const item of submissions) {
    if (!item || typeof item !== "object") continue;
    const fields = (item as Record<string, unknown>).fields as Record<string, unknown> | undefined;
    const blob =
      normalizeObjectId(fields?.walrus_blob_id) ??
      normalizeObjectId(fields?.walrusBlobId) ??
      normalizeObjectId((item as Record<string, unknown>).walrus_blob_id);
    if (blob) out.push(blob);
  }
  return out;
}

function objectFields(content: unknown): Record<string, unknown> | undefined {
  if (!content || typeof content !== "object") return undefined;
  const obj = content as Record<string, unknown>;
  const fields = obj.fields;
  return fields && typeof fields === "object" ? (fields as Record<string, unknown>) : undefined;
}

function extractAddressVector(field: unknown): string[] {
  if (!Array.isArray(field)) return [];
  const out: string[] = [];
  for (const item of field) {
    if (typeof item === "string" && item.trim()) {
      out.push(item.trim());
      continue;
    }
    const id = normalizeObjectId(item);
    if (id) out.push(id);
  }
  return out;
}

function nestedFields(field: unknown): Record<string, unknown> | undefined {
  if (!field || typeof field !== "object") return undefined;
  const obj = field as Record<string, unknown>;
  if (obj.fields && typeof obj.fields === "object") {
    return obj.fields as Record<string, unknown>;
  }
  return obj;
}

export function parsePackExtLineage(content: unknown): {
  parentPackId?: string;
  rootPackId?: string;
  forkDepth: number;
  ancestors: string[];
  version?: number;
} | null {
  const fields = objectFields(content);
  if (!fields) return null;

  const lineageFields = nestedFields(fields.lineage);
  if (!lineageFields) return null;

  const forkDepthRaw = lineageFields.fork_depth ?? lineageFields.forkDepth;
  const forkDepth =
    typeof forkDepthRaw === "number"
      ? forkDepthRaw
      : Number.parseInt(String(forkDepthRaw ?? "0"), 10);

  const versionRaw = fields.version;
  const version =
    typeof versionRaw === "number"
      ? versionRaw
      : Number.parseInt(String(versionRaw ?? ""), 10);

  return {
    parentPackId: extractOptionId(lineageFields.parent),
    rootPackId: extractOptionId(lineageFields.root),
    forkDepth: Number.isFinite(forkDepth) && forkDepth >= 0 ? forkDepth : 0,
    ancestors: extractAddressVector(lineageFields.ancestors),
    ...(Number.isFinite(version) && version > 0 ? { version } : {}),
  };
}

export function packLineageFromParsed(
  packId: string,
  parsed: ReturnType<typeof parsePackExtLineage>,
): PackLineageResult {
  if (!parsed) {
    return {
      checked: true,
      live: true,
      packId,
      forkDepth: 0,
      ancestors: [],
      reasons: ["pack_ext_not_found"],
    };
  }
  return {
    checked: true,
    live: true,
    packId,
    parentPackId: parsed.parentPackId,
    rootPackId: parsed.rootPackId ?? parsed.parentPackId ?? packId,
    forkDepth: parsed.forkDepth,
    ancestors: parsed.ancestors,
    version: parsed.version,
    reasons: [],
  };
}

export function createChainReader(config: ChainReaderConfig): ChainReader {
  const client = new SuiJsonRpcClient({
    url: fullnodeUrl(config.network),
    network: config.network === "localnet" ? "testnet" : config.network,
  });

  return {
    isLive: true,
    network: config.network,
    async verifyMemoryRefs(input: OnChainVerifyInput): Promise<OnChainVerifyResult> {
      const reasons: string[] = [];
      const refs: Record<string, string> = {};
      const walrusBlobId = input.walrusBlobId?.trim();
      let packContainsBlob: boolean | undefined;
      let bountyReferencesBlob: boolean | undefined;
      let txFound: boolean | undefined;
      let txSuccess: boolean | undefined;

      if (input.packId?.trim()) {
        refs.packId = input.packId.trim();
        try {
          const obj = await client.getObject({
            id: input.packId.trim(),
            options: { showContent: true },
          });
          if (!obj.data) {
            reasons.push("pack_not_found");
            packContainsBlob = false;
          } else {
            const fields = objectFields(obj.data.content);
            const blobIds = extractIdVector(fields?.blob_ids);
            if (walrusBlobId) {
              packContainsBlob = blobIds.some(
                (id) => id.toLowerCase() === walrusBlobId.toLowerCase(),
              );
              if (!packContainsBlob) reasons.push("pack_blob_mismatch");
            } else {
              packContainsBlob = blobIds.length > 0;
            }
          }
        } catch {
          reasons.push("pack_query_failed");
          packContainsBlob = false;
        }
      }

      if (input.bountyId?.trim()) {
        refs.bountyId = input.bountyId.trim();
        try {
          const obj = await client.getObject({
            id: input.bountyId.trim(),
            options: { showContent: true },
          });
          if (!obj.data) {
            reasons.push("bounty_not_found");
            bountyReferencesBlob = false;
          } else {
            const fields = objectFields(obj.data.content);
            const v1Blob = extractOptionId(fields?.fulfillment_blob_id);
            const v2Blobs = collectSubmissionBlobIds(fields?.submissions);
            const candidateBlobs = [v1Blob, ...v2Blobs].filter(Boolean) as string[];
            if (walrusBlobId) {
              bountyReferencesBlob = candidateBlobs.some(
                (id) => id.toLowerCase() === walrusBlobId.toLowerCase(),
              );
              if (!bountyReferencesBlob) reasons.push("bounty_blob_mismatch");
            } else {
              bountyReferencesBlob = candidateBlobs.length > 0;
            }
          }
        } catch {
          reasons.push("bounty_query_failed");
          bountyReferencesBlob = false;
        }
      }

      if (input.txDigest?.trim()) {
        refs.txDigest = input.txDigest.trim();
        try {
          const tx = await client.getTransactionBlock({
            digest: input.txDigest.trim(),
            options: { showEffects: true },
          });
          txFound = Boolean(tx);
          txSuccess = tx.effects?.status?.status === "success";
          if (!txFound) reasons.push("tx_not_found");
          if (txFound && !txSuccess) reasons.push("tx_not_success");
        } catch {
          reasons.push("tx_query_failed");
          txFound = false;
          txSuccess = false;
        }
      }

      const checked = Boolean(input.packId || input.bountyId || input.txDigest);
      return {
        checked,
        live: true,
        network: config.network,
        packContainsBlob,
        bountyReferencesBlob,
        txFound,
        txSuccess,
        reasons,
        ...(Object.keys(refs).length > 0 ? { refs } : {}),
      };
    },

    async readPackLineage(packId: string): Promise<PackLineageResult> {
      const id = packId.trim();
      if (!id) {
        return { checked: true, live: true, reasons: ["empty_pack_id"] };
      }

      try {
        const dynamicFields = await client.getDynamicFields({ parentId: id });
        for (const entry of dynamicFields.data ?? []) {
          try {
            const fieldObj = await client.getDynamicFieldObject({
              parentId: id,
              name: entry.name,
            });
            const parsed = parsePackExtLineage(fieldObj.data?.content);
            if (parsed) {
              return packLineageFromParsed(id, parsed);
            }
          } catch {
            continue;
          }
        }
        return packLineageFromParsed(id, null);
      } catch {
        return {
          checked: true,
          live: true,
          packId: id,
          forkDepth: 0,
          ancestors: [],
          reasons: ["pack_lineage_query_failed"],
        };
      }
    },
  };
}

export function tryCreateChainReaderFromEnv(
  env: Record<string, string | undefined> = typeof process !== "undefined"
    ? (process.env as Record<string, string | undefined>)
    : {},
): ChainReader | null {
  const raw = env.SUI_NETWORK?.trim() || "mainnet";
  const network: SuiNetwork =
    raw === "testnet" || raw === "devnet" || raw === "localnet" ? raw : "mainnet";
  return createChainReader({ network });
}

export type {
  ChainReader,
  OnChainVerifyInput,
  OnChainVerifyResult,
  PackLineageResult,
} from "./chain-reader-types.js";
