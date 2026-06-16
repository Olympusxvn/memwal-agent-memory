import type { ChainReader } from "@memwalpp/memwal-client";
import type { DurableMemoryStore } from "@memwalpp/memwal-client";
import type { LocalMemoryStore } from "@memwalpp/local-memory";
import type { MemoryRecord } from "@memwalpp/shared";
import { hashMemoryContent, MEMORY_METADATA_KEYS } from "@memwalpp/shared";

export interface MemoryProofV1 {
  version: "1";
  memoryId: string;
  namespace: string;
  contentHash: string;
  walrusBlobId?: string;
  issuedAtMs?: number;
}

export interface VerifyLayerResult {
  valid: boolean;
  reasons: string[];
}

export interface VerifyWalrusResult extends VerifyLayerResult {
  checked: boolean;
  live: boolean;
  found?: boolean;
  blobId?: string;
}

export interface VerifyOnChainResult {
  checked: boolean;
  live: boolean;
  valid: boolean;
  network?: string;
  packContainsBlob?: boolean;
  bountyReferencesBlob?: boolean;
  txFound?: boolean;
  txSuccess?: boolean;
  reasons: string[];
  refs?: Record<string, string>;
}

export interface VerifyMemoryInput {
  proof?: string;
  memoryId?: string;
  checkWalrus?: boolean;
  checkOnChain?: boolean;
}

export interface VerifyMemoryResult {
  valid: boolean;
  memoryId?: string;
  walrusBlobId?: string;
  local: VerifyLayerResult & {
    synced?: boolean;
    contentHash?: string;
  };
  walrus: VerifyWalrusResult;
  onChain: VerifyOnChainResult;
}

export function verifyLocalProof(proof: MemoryProofV1, record?: MemoryRecord): VerifyLayerResult & {
  synced?: boolean;
  contentHash?: string;
  walrusBlobId?: string;
} {
  const reasons: string[] = [];
  if (proof.version !== "1") reasons.push("unsupported_proof_version");
  if (!proof.memoryId?.trim()) reasons.push("missing_memory_id");
  if (!proof.contentHash?.trim()) reasons.push("missing_content_hash");

  if (!record) {
    reasons.push("record_not_found");
    return { valid: false, reasons, contentHash: proof.contentHash };
  }

  if (record.id !== proof.memoryId) reasons.push("memory_id_mismatch");
  if (record.namespace !== proof.namespace) reasons.push("namespace_mismatch");
  const recordHash = hashMemoryContent(record.content);
  if (recordHash !== proof.contentHash) reasons.push("content_hash_mismatch");
  if (proof.walrusBlobId && record.walrusBlobId !== proof.walrusBlobId) {
    reasons.push("walrus_blob_mismatch");
  }
  if (record.metadata?.deleted === "1" || record.metadata?.deleted === "true") {
    reasons.push("record_deleted");
  }

  return {
    valid: reasons.length === 0,
    reasons,
    synced: record.synced,
    contentHash: recordHash,
    walrusBlobId: record.walrusBlobId,
  };
}

export function proofFromRecord(record: MemoryRecord): MemoryProofV1 {
  return {
    version: "1",
    memoryId: record.id,
    namespace: record.namespace,
    contentHash: hashMemoryContent(record.content),
    walrusBlobId: record.walrusBlobId,
    issuedAtMs: Date.now(),
  };
}

export async function verifyMemoryLayers(deps: {
  local: LocalMemoryStore;
  durable: DurableMemoryStore;
  chainReader?: ChainReader | null;
  input: VerifyMemoryInput;
}): Promise<VerifyMemoryResult | { valid: false; reasons: string[] }> {
  let proof: MemoryProofV1 | undefined;
  if (deps.input.proof?.trim()) {
    try {
      proof = JSON.parse(deps.input.proof) as MemoryProofV1;
    } catch {
      return { valid: false, reasons: ["invalid_json"] };
    }
  }

  const memoryId = proof?.memoryId?.trim() || deps.input.memoryId?.trim();
  if (!memoryId) {
    return { valid: false, reasons: ["missing_memory_id_or_proof"] };
  }

  const row = await deps.local.getById(memoryId);
  if (!proof && row) {
    proof = proofFromRecord(row);
  }
  if (!proof) {
    return { valid: false, reasons: ["record_not_found"] };
  }

  const local = verifyLocalProof(proof, row);
  const walrusBlobId = proof.walrusBlobId ?? row?.walrusBlobId;
  const checkWalrus = deps.input.checkWalrus !== false;
  const md = row?.metadata ?? {};

  let walrus: VerifyWalrusResult = {
    checked: false,
    live: deps.durable.isLive,
    valid: true,
    reasons: [],
  };

  if (checkWalrus && walrusBlobId) {
    const blobResult = await deps.durable.verifyBlob(walrusBlobId, {
      namespace: row?.namespace ?? proof.namespace,
      recordId: memoryId,
    });
    const reasons = [...blobResult.reasons];
    let valid = blobResult.found || (local.synced === true && local.valid);
    if (!blobResult.found && local.synced && local.valid && blobResult.reasons.includes("walrus_index_unavailable")) {
      valid = true;
    } else if (!blobResult.found && blobResult.checked) {
      valid = false;
      if (!reasons.includes("walrus_blob_not_found")) reasons.push("walrus_blob_not_found");
    }
    walrus = {
      checked: blobResult.checked,
      live: blobResult.live,
      found: blobResult.found,
      blobId: walrusBlobId,
      valid,
      reasons,
    };
  } else if (checkWalrus && !walrusBlobId) {
    walrus = {
      checked: true,
      live: deps.durable.isLive,
      valid: true,
      reasons: ["no_walrus_blob_to_check"],
    };
  }

  const hasOnChainRefs = Boolean(
    md[MEMORY_METADATA_KEYS.packId] ||
      md[MEMORY_METADATA_KEYS.bountyId] ||
      md[MEMORY_METADATA_KEYS.txDigest] ||
      md[MEMORY_METADATA_KEYS.fulfillmentTxDigest],
  );
  const checkOnChain =
    deps.input.checkOnChain === true ||
    (deps.input.checkOnChain !== false && hasOnChainRefs);

  let onChain: VerifyOnChainResult = {
    checked: false,
    live: Boolean(deps.chainReader?.isLive),
    valid: true,
    reasons: [],
  };

  if (checkOnChain) {
    if (!deps.chainReader?.isLive) {
      onChain = {
        checked: true,
        live: false,
        valid: !hasOnChainRefs,
        reasons: hasOnChainRefs ? ["chain_reader_offline"] : ["no_on_chain_refs"],
      };
    } else {
      const chain = await deps.chainReader.verifyMemoryRefs({
        walrusBlobId,
        packId: md[MEMORY_METADATA_KEYS.packId],
        bountyId: md[MEMORY_METADATA_KEYS.bountyId],
        txDigest: md[MEMORY_METADATA_KEYS.fulfillmentTxDigest] ?? md[MEMORY_METADATA_KEYS.txDigest],
      });
      const chainReasons = [...chain.reasons];
      let valid = chainReasons.length === 0;
      if (!chain.checked) {
        valid = true;
        if (!hasOnChainRefs) chainReasons.push("no_on_chain_refs");
      }
      onChain = {
        checked: chain.checked,
        live: chain.live,
        valid,
        network: chain.network,
        packContainsBlob: chain.packContainsBlob,
        bountyReferencesBlob: chain.bountyReferencesBlob,
        txFound: chain.txFound,
        txSuccess: chain.txSuccess,
        reasons: chainReasons,
        refs: chain.refs,
      };
    }
  }

  const valid = local.valid && walrus.valid && onChain.valid;

  return {
    valid,
    memoryId,
    walrusBlobId,
    local,
    walrus,
    onChain,
  };
}
