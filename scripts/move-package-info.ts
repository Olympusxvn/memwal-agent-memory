#!/usr/bin/env node
/**
 * Print deployed Move package metadata for judges / integrators.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  MAINNET_DEPLOYED_OBJECTS,
  MARKETPLACE_PACKAGE_ID,
  MOVE_MODULES,
  moveTarget,
  walCoinType,
} from "@memwalpp/shared";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  readFileSync(join(root, "packages/sui-contracts/deploy-manifest.json"), "utf8"),
) as { version: number; network: string };

console.log("\n═══ MemWal++ Move package (mainnet) ═══\n");
console.log(`Package ID:     ${MARKETPLACE_PACKAGE_ID}`);
console.log(`Version:        ${manifest.version} (${manifest.network})`);
console.log(`Marketplace:    ${MAINNET_DEPLOYED_OBJECTS.marketplace}`);
console.log(`UpgradeCap:     ${MAINNET_DEPLOYED_OBJECTS.upgradeCap}`);
console.log(`WAL Treasury:   ${MAINNET_DEPLOYED_OBJECTS.walTreasuryCap}`);
console.log(`WAL coin type:  ${walCoinType()}`);
console.log("\nModules:");
for (const m of MOVE_MODULES) {
  console.log(`  - ${m}`);
}
console.log("\nExample PTB targets:");
console.log(`  mint:   ${moveTarget("memory_nft", "mint_pack")}`);
console.log(`  list:   ${moveTarget("marketplace", "list_pack")}`);
console.log(`  bounty: ${moveTarget("bounty", "post_bounty")}`);
console.log(`  bounty_v2: ${moveTarget("bounty_v2", "post_bounty_v2")}`);
console.log(`  buy_v2: ${moveTarget("marketplace_v2", "buy_pack_v2")}`);
console.log(`  seal:   ${moveTarget("access_policy", "seal_approve_for_blob")}`);
console.log("\nDocs: docs/deploy.md · packages/sui-contracts/README.md\n");
