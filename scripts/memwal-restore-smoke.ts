/**
 * Optional judge/maintainer smoke: re-index a namespace from Walrus blobs.
 * Requires MEMWAL_PRIVATE_KEY + MEMWAL_ACCOUNT_ID in .env (delegate only).
 *
 * Usage: pnpm memwal:restore-smoke
 */
import { loadMemWalConfigFromEnv } from "../packages/memwal-client/src/config.js";
import { createMemWalService } from "../packages/memwal-client/src/service.js";

async function main(): Promise<void> {
  const cfg = loadMemWalConfigFromEnv();
  if (!cfg) {
    console.error(
      "memwal:restore-smoke — missing MEMWAL_PRIVATE_KEY or MEMWAL_ACCOUNT_ID (see .env.example)",
    );
    process.exit(1);
  }

  const namespace = process.env.MEMWAL_NAMESPACE?.trim() || cfg.namespace || "default";
  const svc = createMemWalService(cfg);

  const health = await svc.health();
  console.log(`relayer health: ${health.ok ? "ok" : "fail"}${health.version ? ` (${health.version})` : ""}`);

  const result = await svc.restore(namespace, 10);
  console.log(
    `restore namespace="${namespace}": restored=${result.restored} skipped=${result.skipped} total=${result.total}`,
  );
  console.log("Next: memwal.recall({ query }) — proves Walrus-backed index is searchable.");

  svc.destroy();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
