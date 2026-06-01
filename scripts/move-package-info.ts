#!/usr/bin/env node
/**
 * Print deployed Move package metadata for judges / integrators.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  MAINNET_DEPLOYED_OBJECTS,
  MAINNET_V2_OBJECTS,
  MARKETPLACE_PACKAGE_ORIGINAL_ID,
  MARKETPLACE_PACKAGE_PUBLISHED_AT,
  MOVE_MODULES,
  moveTarget,
  walCoinType,
} from "@memwalpp/shared";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  readFileSync(join(root, "packages/sui-contracts/deploy-manifest.json"), "utf8"),
) as {
  version: number;
  network: string;
  publishedAt?: string;
  transactions?: { bootstrapV2?: string };
};

console.log("\n═══ MemWal++ Move package (mainnet) ═══\n");
console.log(`Original ID:    ${MARKETPLACE_PACKAGE_ORIGINAL_ID}  (WAL type, explorer)`);
console.log(`Published-at:   ${MARKETPLACE_PACKAGE_PUBLISHED_AT}  (PTB moveTarget)`);
console.log(`Version:        ${manifest.version} (${manifest.network})`);
console.log("\n── v1 objects ──");
console.log(`Marketplace:    ${MAINNET_DEPLOYED_OBJECTS.marketplace}`);
console.log(`UpgradeCap:     ${MAINNET_DEPLOYED_OBJECTS.upgradeCap}`);
console.log(`WAL Treasury:   ${MAINNET_DEPLOYED_OBJECTS.walTreasuryCap}`);
console.log(`WAL coin type:  ${walCoinType()}`);
console.log("\n── v2 objects (bootstrapped) ──");
console.log(`Config:         ${MAINNET_V2_OBJECTS.config}`);
console.log(`MarketplaceV2:  ${MAINNET_V2_OBJECTS.marketplaceV2}`);
console.log(`AdminCap:       ${MAINNET_V2_OBJECTS.adminCap}`);
console.log(`BootstrapReg:   ${MAINNET_V2_OBJECTS.bootstrapRegistry}`);
if (manifest.transactions?.bootstrapV2) {
  console.log(`Bootstrap tx:   ${manifest.transactions.bootstrapV2}`);
}
console.log("\nModules:");
for (const m of MOVE_MODULES) {
  console.log(`  - ${m}`);
}
console.log("\nExample PTB targets (published-at):");
console.log(`  mint:      ${moveTarget("memory_nft", "mint_pack")}`);
console.log(`  list:      ${moveTarget("marketplace", "list_pack")}`);
console.log(`  bounty:    ${moveTarget("bounty", "post_bounty")}`);
console.log(`  bounty_v2: ${moveTarget("bounty_v2", "post_bounty_v2")}`);
console.log(`  buy_v2:    ${moveTarget("marketplace_v2", "buy_pack_v2")}`);
console.log(`  seal:      ${moveTarget("access_policy", "seal_approve_for_blob")}`);
console.log("\nOperator v2:");
console.log("  upgrade:    pnpm contracts:upgrade-v2  (requires Sui CLI ≥ mainnet-v1.72.2)");
console.log("  bootstrap:  pnpm contracts:bootstrap-v2");
console.log("\nDocs: docs/deploy.md · packages/sui-contracts/README.md\n");
