import {
  MAINNET_DEPLOYED_OBJECTS,
  MAINNET_V2_OBJECTS,
  MARKETPLACE_PACKAGE_ID,
  type ObjectId,
} from "@memwalpp/shared";

export type SuiNetwork = "mainnet" | "testnet" | "devnet" | "localnet";

export interface ChainClientConfig {
  network: SuiNetwork;
  packageId: ObjectId;
  marketplaceId: ObjectId;
  walTreasuryCapId: ObjectId;
  /** When set (non-zero), prefer v2 marketplace/bounty entrypoints. */
  configId?: ObjectId;
  marketplaceV2Id?: ObjectId;
  signerPrivateKey: string;
}

function trim(v: string | undefined): string {
  return v?.trim() ?? "";
}

function isConfiguredObjectId(id: string | undefined): id is ObjectId {
  return Boolean(id && id !== "0x0" && id.startsWith("0x"));
}

function parseNetwork(raw: string): SuiNetwork {
  if (raw === "testnet" || raw === "devnet" || raw === "localnet") return raw;
  return "mainnet";
}

/**
 * Load chain signing config from env. Returns null when delegate key or marketplace ids are missing.
 * Uses v2 object ids when `CONFIG_OBJECT_ID` / `MARKETPLACE_V2_OBJECT_ID` are set (post-bootstrap).
 */
export function loadChainConfigFromEnv(
  env: Record<string, string | undefined> = typeof process !== "undefined"
    ? (process.env as Record<string, string | undefined>)
    : {},
): ChainClientConfig | null {
  const signerPrivateKey =
    trim(env.SUI_DELEGATE_PRIVATE_KEY) || trim(env.MEMWAL_PRIVATE_KEY);
  if (!signerPrivateKey) return null;

  const marketplaceId =
    trim(env.MARKETPLACE_OBJECT_ID) || MAINNET_DEPLOYED_OBJECTS.marketplace;
  const walTreasuryCapId =
    trim(env.WAL_TREASURY_CAP_ID) || MAINNET_DEPLOYED_OBJECTS.walTreasuryCap;
  if (!isConfiguredObjectId(marketplaceId) || !isConfiguredObjectId(walTreasuryCapId)) {
    return null;
  }

  const configId = trim(env.CONFIG_OBJECT_ID) || MAINNET_V2_OBJECTS.config;
  const marketplaceV2Id =
    trim(env.MARKETPLACE_V2_OBJECT_ID) || MAINNET_V2_OBJECTS.marketplaceV2;

  return {
    network: parseNetwork(trim(env.SUI_NETWORK) || "mainnet"),
    packageId: (trim(env.MARKETPLACE_PACKAGE_ID) ||
      MARKETPLACE_PACKAGE_ID) as ObjectId,
    marketplaceId,
    walTreasuryCapId,
    configId: isConfiguredObjectId(configId) ? configId : undefined,
    marketplaceV2Id: isConfiguredObjectId(marketplaceV2Id)
      ? marketplaceV2Id
      : undefined,
    signerPrivateKey,
  };
}

export function chainUsesV2(config: ChainClientConfig): boolean {
  return Boolean(config.configId && config.marketplaceV2Id);
}
