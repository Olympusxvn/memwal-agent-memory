import { getJsonRpcFullnodeUrl, SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import type { ObjectId } from "@memwalpp/shared";

import type { ChainClientConfig, SuiNetwork } from "./config.js";
import { loadChainConfigFromEnv } from "./config.js";
import {
  buildBuyPackTx,
  buildForkPackTx,
  buildListPackTx,
  buildPostBountyTx,
  buildSubmitFulfillmentTx,
} from "./ptb-builders.js";

export interface ChainExecuteResult {
  txDigest: string;
  effects?: unknown;
}

export interface ChainClient {
  readonly isLive: true;
  readonly config: ChainClientConfig;
  readonly address: string;
  postBounty(params: {
    amountMist: bigint;
    deadlineMs: bigint;
    description: string;
    minScore?: number;
  }): Promise<ChainExecuteResult>;
  submitFulfillment(params: {
    bountyId: ObjectId;
    walrusBlobId: string;
    packId?: ObjectId;
  }): Promise<ChainExecuteResult>;
  listMemoryPack(params: { packObjectId: ObjectId; priceMist: bigint }): Promise<ChainExecuteResult>;
  buyMemoryPack(params: { packId: ObjectId; priceMist: bigint }): Promise<ChainExecuteResult>;
  forkMemory(params: {
    parentPackObjectId: ObjectId;
    newBlobIds: ObjectId[];
    contentHash: string;
    royaltyBps?: number;
  }): Promise<ChainExecuteResult>;
}

function fullnodeUrl(network: SuiNetwork): string {
  if (network === "localnet") return getJsonRpcFullnodeUrl("localnet");
  return getJsonRpcFullnodeUrl(network);
}

function keypairFromPrivateKey(privateKey: string): Ed25519Keypair {
  if (privateKey.includes("suiprivkey")) {
    const { secretKey } = decodeSuiPrivateKey(privateKey);
    return Ed25519Keypair.fromSecretKey(secretKey);
  }
  const hex = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
  return Ed25519Keypair.fromSecretKey(Uint8Array.from(Buffer.from(hex, "hex")));
}

async function executeTx(
  client: SuiJsonRpcClient,
  keypair: Ed25519Keypair,
  tx: import("@mysten/sui/transactions").Transaction,
): Promise<ChainExecuteResult> {
  tx.setSender(keypair.toSuiAddress());
  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showEffects: true },
  });
  return { txDigest: result.digest, effects: result.effects };
}

export function createChainClient(config: ChainClientConfig): ChainClient {
  const client = new SuiJsonRpcClient({
    url: fullnodeUrl(config.network),
    network: config.network === "localnet" ? "testnet" : config.network,
  });
  const keypair = keypairFromPrivateKey(config.signerPrivateKey);
  const address = keypair.toSuiAddress();

  return {
    isLive: true,
    config,
    address,
    async postBounty(params) {
      const tx = buildPostBountyTx(config, params);
      return executeTx(client, keypair, tx);
    },
    async submitFulfillment(params) {
      const tx = buildSubmitFulfillmentTx(config, params);
      return executeTx(client, keypair, tx);
    },
    async listMemoryPack(params) {
      const tx = buildListPackTx(config, params);
      return executeTx(client, keypair, tx);
    },
    async buyMemoryPack(params) {
      const tx = buildBuyPackTx(config, { ...params, sender: address });
      return executeTx(client, keypair, tx);
    },
    async forkMemory(params) {
      const tx = buildForkPackTx(config, {
        ...params,
        sender: address,
        royaltyBps: params.royaltyBps ?? 100,
      });
      return executeTx(client, keypair, tx);
    },
  };
}

export function tryCreateChainClientFromEnv(
  env?: Record<string, string | undefined>,
): ChainClient | null {
  const config = loadChainConfigFromEnv(env);
  if (!config) return null;
  return createChainClient(config);
}
