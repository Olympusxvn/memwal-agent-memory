#!/usr/bin/env node
/**
 * Operator script: bootstrap v2 shared objects after upgrade.
 *
 * Flow: admin::bootstrap → marketplace_v2::bootstrap (single PTB).
 *
 * Usage:
 *   pnpm contracts:bootstrap-v2 --discover
 *   SUI_OPERATOR_PRIVATE_KEY=... pnpm contracts:bootstrap-v2
 *   pnpm contracts:bootstrap-v2 --discover --upgrade-digest=<upgrade-tx-digest>
 *
 * Env:
 *   SUI_OPERATOR_PRIVATE_KEY | SUI_DELEGATE_PRIVATE_KEY | MEMWAL_PRIVATE_KEY
 *   BOOTSTRAP_REGISTRY_ID (optional — or UPGRADE_TX_DIGEST from upgrade tx)
 *   MARKETPLACE_PACKAGE_ID, SUI_NETWORK
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildBootstrapV2Tx } from "../packages/memwal-client/src/chain/ptb-builders.js";
import {
  MAINNET_DEPLOYED_OBJECTS,
  MARKETPLACE_PACKAGE_ID,
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

interface QueryObjectsPage {
  data?: Array<{
    data?: {
      objectId: string;
      content?: {
        dataType?: string;
        fields?: Record<string, unknown>;
      };
    };
  }>;
}

function trim(v: string | undefined): string {
  return v?.trim() ?? "";
}

function parseArgs(argv: string[]) {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  const registryFlag = argv.find((a) => a.startsWith("--registry="));
  const digestFlag = argv.find((a) => a.startsWith("--upgrade-digest="));
  return {
    discover: flags.has("--discover"),
    dryRun: flags.has("--dry-run"),
    writeManifest: flags.has("--write-manifest"),
    registryId: registryFlag?.slice("--registry=".length) ?? trim(process.env.BOOTSTRAP_REGISTRY_ID),
    upgradeDigest:
      digestFlag?.slice("--upgrade-digest=".length) ?? trim(process.env.UPGRADE_TX_DIGEST),
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

async function findRegistryFromUpgradeDigest(
  client: SuiJsonRpcClient,
  digest: string,
  packageId: string,
): Promise<string | null> {
  const tx = await client.getTransactionBlock({
    digest,
    options: { showObjectChanges: true },
  });
  for (const change of (tx.objectChanges ?? []) as ObjectChange[]) {
    if (
      change.type === "created" &&
      change.objectType === `${packageId}::admin::BootstrapRegistry` &&
      change.objectId
    ) {
      return change.objectId;
    }
  }
  return null;
}

async function tryQueryRegistryRpc(
  client: SuiJsonRpcClient,
  packageId: string,
): Promise<string | null> {
  const structType = `${packageId}::admin::BootstrapRegistry`;
  for (const method of ["suix_queryObjects", "sui_queryObjects"] as const) {
    try {
      const page = await client.call<QueryObjectsPage>(method, [
        {
          filter: { StructType: structType },
          options: { showContent: true },
        },
      ]);
      const hit = page.data?.[0]?.data;
      if (hit?.objectId) return hit.objectId;
    } catch {
      // RPC may not expose queryObjects on this network — fall through.
    }
  }
  return null;
}

async function resolveBootstrapRegistry(
  client: SuiJsonRpcClient,
  packageId: string,
  opts: { registryId?: string; upgradeDigest?: string },
): Promise<{ objectId: string; done: boolean } | null> {
  if (opts.registryId) {
    const obj = await client.getObject({
      id: opts.registryId,
      options: { showContent: true },
    });
    const done = Boolean(
      (obj.data?.content as { fields?: { done?: boolean } } | undefined)?.fields?.done,
    );
    return { objectId: opts.registryId, done };
  }

  if (opts.upgradeDigest) {
    const id = await findRegistryFromUpgradeDigest(client, opts.upgradeDigest, packageId);
    if (id) {
      const obj = await client.getObject({ id, options: { showContent: true } });
      const done = Boolean(
        (obj.data?.content as { fields?: { done?: boolean } } | undefined)?.fields?.done,
      );
      return { objectId: id, done };
    }
  }

  const queried = await tryQueryRegistryRpc(client, packageId);
  if (queried) {
    const obj = await client.getObject({ id: queried, options: { showContent: true } });
    const done = Boolean(
      (obj.data?.content as { fields?: { done?: boolean } } | undefined)?.fields?.done,
    );
    return { objectId: queried, done };
  }

  return null;
}

function printDiscoverHelp(packageId: string) {
  console.error(`
Could not find BootstrapRegistry on-chain.

1. Upgrade bytecode first:
     pnpm contracts:upgrade-v2

2. Locate the registry object id from the upgrade transaction (Suiscan → Object Changes)
   or set UPGRADE_TX_DIGEST / --upgrade-digest=<digest>

3. Re-run:
     pnpm contracts:bootstrap-v2 --discover --upgrade-digest=<digest>
     BOOTSTRAP_REGISTRY_ID=0x... pnpm contracts:bootstrap-v2

Struct type: ${packageId}::admin::BootstrapRegistry
`);
}

function extractBootstrapIds(
  objectChanges: ObjectChange[] | undefined,
  packageId: string,
): {
  configId?: string;
  marketplaceV2Id?: string;
  adminCapId?: string;
} {
  const out: {
    configId?: string;
    marketplaceV2Id?: string;
    adminCapId?: string;
  } = {};
  for (const change of objectChanges ?? []) {
    if (change.type !== "created" || !change.objectType || !change.objectId) continue;
    if (change.objectType === `${packageId}::admin::Config`) out.configId = change.objectId;
    if (change.objectType === `${packageId}::marketplace_v2::MarketplaceV2`) {
      out.marketplaceV2Id = change.objectId;
    }
    if (change.objectType === `${packageId}::admin::AdminCap`) out.adminCapId = change.objectId;
  }
  return out;
}

function printEnvBlock(ids: { configId?: string; marketplaceV2Id?: string; adminCapId?: string }) {
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const packageId = trim(process.env.MARKETPLACE_PACKAGE_ID) || MARKETPLACE_PACKAGE_ID;
  const network = parseNetwork(trim(process.env.SUI_NETWORK) || "mainnet");
  const client = new SuiJsonRpcClient({
    url: getJsonRpcFullnodeUrl(network),
    network,
  });

  let registryId = args.registryId;
  const resolved = await resolveBootstrapRegistry(client, packageId, {
    registryId: registryId || undefined,
    upgradeDigest: args.upgradeDigest || undefined,
  });

  if (!resolved) {
    printDiscoverHelp(packageId);
    process.exit(1);
  }

  registryId = resolved.objectId;
  console.log(`BootstrapRegistry: ${registryId} (done=${resolved.done})`);
  if (resolved.done) {
    console.error("Bootstrap already completed (registry.done=true). Aborting.");
    process.exit(1);
  }

  if (args.discover) {
    console.log("\nUse this registry id:");
    console.log(`BOOTSTRAP_REGISTRY_ID=${registryId}`);
    process.exit(0);
  }

  const privateKey = operatorPrivateKey();
  if (args.dryRun || !privateKey) {
    const keypair = privateKey ? keypairFromPrivateKey(privateKey) : null;
    const sender =
      keypair?.toSuiAddress() ??
      "0x0000000000000000000000000000000000000000000000000000000000000001";
    const tx = buildBootstrapV2Tx(
      { packageId: packageId as ObjectId },
      { bootstrapRegistryId: registryId as ObjectId, sender },
    );
    console.log("\nDry-run bootstrap PTB:");
    console.log(`  Registry:  ${registryId}`);
    console.log(`  Sender:    ${sender}`);
    console.log(`  Commands:  ${tx.getData().commands.length}`);
    if (!privateKey) {
      console.error("\nSet SUI_OPERATOR_PRIVATE_KEY to execute on-chain.");
      process.exit(args.dryRun ? 0 : 1);
    }
    if (args.dryRun) process.exit(0);
  }

  const keypair = keypairFromPrivateKey(privateKey!);
  const sender = keypair.toSuiAddress();
  console.log(`\nExecuting bootstrap as ${sender}…`);

  const tx = buildBootstrapV2Tx(
    { packageId: packageId as ObjectId },
    { bootstrapRegistryId: registryId as ObjectId, sender },
  );
  tx.setSender(sender);

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: { showObjectChanges: true, showEffects: true },
  });

  console.log(`\nBootstrap tx digest: ${result.digest}`);
  const ids = extractBootstrapIds(result.objectChanges as ObjectChange[] | undefined, packageId);
  printEnvBlock(ids);

  if (args.writeManifest) {
    writeManifestV2({ ...ids, bootstrapRegistryId: registryId });
  } else {
    console.log("\nTip: re-run with --write-manifest to update deploy-manifest.json");
  }

  console.log("\nUpgradeCap (unchanged):", MAINNET_DEPLOYED_OBJECTS.upgradeCap);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
