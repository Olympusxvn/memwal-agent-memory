#!/usr/bin/env node
import {
  MAINNET_DEPLOYED_OBJECTS,
  MARKETPLACE_PACKAGE_ID,
  moveTarget,
  walCoinType,
} from "@memwalpp/shared";

const cmd = process.argv[2] ?? "help";

if (cmd === "move-info" || cmd === "move") {
  console.log("MemWal++ Move package (mainnet)\n");
  console.log("Package:", MARKETPLACE_PACKAGE_ID);
  console.log("Marketplace:", MAINNET_DEPLOYED_OBJECTS.marketplace);
  console.log("WAL type:", walCoinType());
  console.log("\nTargets:");
  console.log("  bounty::post_bounty", moveTarget("bounty", "post_bounty"));
  console.log("  memory_nft::mint_pack", moveTarget("memory_nft", "mint_pack"));
  process.exit(0);
}

console.log(`memwalpp-cli — usage:
  move-info   Print deployed package IDs and PTB targets
  (default)   MemWal stub ping

Also: pnpm contracts:info from repo root
`);
import { createMemWalStub } from "@memwalpp/memwal-client";

const c = await createMemWalStub();
console.log(c.ping());
