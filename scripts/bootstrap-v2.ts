#!/usr/bin/env node
/**
 * Operator script: bootstrap v2 shared objects after upgrade.
 *
 * Flow: admin::bootstrap_v2_state(UpgradeCap) → marketplace_v2::bootstrap (single PTB).
 *
 * Usage:
 *   pnpm contracts:bootstrap-v2 --dry-run
 *   SUI_OPERATOR_PRIVATE_KEY=... pnpm contracts:bootstrap-v2 --write-manifest
 *
 * Env:
 *   SUI_OPERATOR_PRIVATE_KEY | SUI_DELEGATE_PRIVATE_KEY | MEMWAL_PRIVATE_KEY
 *   UPGRADE_CAP_ID (defaults to mainnet UpgradeCap)
 *   MARKETPLACE_PACKAGE_PUBLISHED_AT (defaults to mainnet published-at), SUI_NETWORK
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildBootstrapV2Tx } from "../packages/memwal-client/src/chain/ptb-builders.js";
import {
  MAINNET_DEPLOYED_OBJECTS,
  MARKETPLACE_PACKAGE_PUBLISHED_AT,
  type ObjectId,
} from "@memwalpp/shared";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { getJsonRpcFullnodeUrl, SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(root, "packages/sui-contracts/deploy-manifest.json");

type SuiNetwork = "mainnet" | "testnet" | "devnet";

interface ObjectChange {
  type: string;
  objectType?: string;
  objectId?: string;
}

function trim(v: string | undefined): string {
  return v?.trim() ?? "";
}

function parseArgs(argv: string[]) {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  return {
    dryRun: flags.has("--dry-run"),
    writeManifest: flags.has("--write-manifest"),
  };
}

function parseNetwork(raw: string): SuiNetwork {
  if (raw === "testnet" || raw === "devnet") return raw;
  return "mainnet";
}

function keypairFromPrivateKey(privateKey: string): Ed25519Keypair {
  if (privateKey.includes("suiprivkey")) {
    const { secretKey } = decodeSuiPrivateKey(privateKey);
    return Ed25519Keypair.fromSecretKey(secretKey);
  }
  const hex = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
  return Ed25519Keypair.fromSecretKey(Uint8Array.from(Buffer.from(hex, "hex")));
}

function operatorPrivateKey(): string | null {
  return (
    trim(process.env.SUI_OPERATOR_PRIVATE_KEY) ||
    trim(process.env.SUI_DELEGATE_PRIVATE_KEY) ||
    trim(process.env.MEMWAL_PRIVATE_KEY) ||
    null
  );
}

function extractBootstrapIds(
  objectChanges: ObjectChange[] | undefined,
  packageId: string,
): {
  configId?: string;
  marketplaceV2Id?: string;
  adminCapId?: string;
  bootstrapRegistryId?: string;
} {
  const out: {
    configId?: string;
    marketplaceV2Id?: string;
    adminCapId?: string;
    bootstrapRegistryId?: string;
  } = {};
  for (const change of objectChanges ?? []) {
    if (change.type !== "created" || !change.objectType || !change.objectId) continue;
    if (change.objectType === `${packageId}::admin::Config`) out.configId = change.objectId;
    if (change.objectType === `${packageId}::marketplace_v2::MarketplaceV2`) {
      out.marketplaceV2Id = change.objectId;
    }
    if (change.objectType === `${packageId}::admin::AdminCap`) out.adminCapId = change.objectId;
    if (change.objectType === `${packageId}::admin::BootstrapRegistry`) {
      out.bootstrapRegistryId = change.objectId;
    }
  }
  return out;
}

function printEnvBlock(ids: {
  configId?: string;
  marketplaceV2Id?: string;
  adminCapId?: string;
}) {
  console.log("\n# Add to .env after bootstrap:");
  if (ids.configId) console.log(`CONFIG_OBJECT_ID=${ids.configId}`);
  if (ids.marketplaceV2Id) console.log(`MARKETPLACE_V2_OBJECT_ID=${ids.marketplaceV2Id}`);
  if (ids.adminCapId) console.log(`# AdminCap (operator custody): ${ids.adminCapId}`);
  console.log("\n# Update packages/shared/src/deployed-package.ts MAINNET_V2_OBJECTS with the ids above.");
}

function writeManifestV2(ids: {
  configId?: string;
  marketplaceV2Id?: string;
  adminCapId?: string;
  bootstrapRegistryId?: string;
}) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
  manifest.modules = [
    "wal",
    "memory_nft",
    "royalty",
    "marketplace",
    "bounty",
    "delegate_bridge",
    "access_policy",
    "constants",
    "events",
    "admin",
    "memory_ext",
    "marketplace_v2",
    "bounty_v2",
  ];
  manifest.v2 = {
    bootstrappedAt: new Date().toISOString(),
    objects: {
      bootstrapRegistry: ids.bootstrapRegistryId,
      config: ids.configId,
      marketplaceV2: ids.marketplaceV2Id,
      adminCap: ids.adminCapId,
    },
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`\nUpdated ${manifestPath}`);
}

async function assertV2ModulesOnChain(client: SuiJsonRpcClient, packageId: string) {
  const mods = await client.getNormalizedMoveModulesByPackage({ package: packageId });
  if (!mods.admin || !mods.marketplace_v2) {
    console.error(
      "v2 modules not on-chain yet. Run: pnpm contracts:upgrade-v2 (requires Sui CLI ≥ mainnet-v1.72.2)",
    );
    process.exit(1);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const packageId =
    trim(process.env.MARKETPLACE_PACKAGE_PUBLISHED_AT) ||
    MARKETPLACE_PACKAGE_PUBLISHED_AT;
  const upgradeCapId =
    trim(process.env.UPGRADE_CAP_ID) || MAINNET_DEPLOYED_OBJECTS.upgradeCap;
  const network = parseNetwork(trim(process.env.SUI_NETWORK) || "mainnet");
  const client = new SuiJsonRpcClient({
    url: getJsonRpcFullnodeUrl(network),
    network,
  });

  await assertV2ModulesOnChain(client, packageId);

  const privateKey = operatorPrivateKey();
  const keypair = privateKey ? keypairFromPrivateKey(privateKey) : null;
  const sender =
    keypair?.toSuiAddress() ??
    "0x0000000000000000000000000000000000000000000000000000000000000001";

  const tx = buildBootstrapV2Tx(
    { packageId: packageId as ObjectId },
    { upgradeCapId: upgradeCapId as ObjectId, sender },
  );

  if (args.dryRun || !privateKey) {
    console.log("\nDry-run bootstrap PTB:");
    console.log(`  UpgradeCap: ${upgradeCapId}`);
    console.log(`  Sender:     ${sender}`);
    console.log(`  Commands:   ${tx.getData().commands.length}`);
    if (!privateKey) {
      console.error("\nSet SUI_OPERATOR_PRIVATE_KEY to execute on-chain.");
      process.exit(args.dryRun ? 0 : 1);
    }
    if (args.dryRun) process.exit(0);
  }

  console.log(`\nExecuting bootstrap as ${sender}…`);
  tx.setSender(sender);

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair!,
    options: { showObjectChanges: true, showEffects: true },
  });

  console.log(`\nBootstrap tx digest: ${result.digest}`);
  const ids = extractBootstrapIds(result.objectChanges as ObjectChange[] | undefined, packageId);
  printEnvBlock(ids);

  if (args.writeManifest) {
    writeManifestV2(ids);
  } else {
    console.log("\nTip: re-run with --write-manifest to update deploy-manifest.json");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
