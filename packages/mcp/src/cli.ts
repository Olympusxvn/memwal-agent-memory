#!/usr/bin/env node
import {
  createMemWalMcpDepsFromEnv,
  resolveMcpConfig,
  validateHttpStartupConfig,
} from "./runtime/create-deps.js";
import { createMemWalMcpServer } from "./server.js";

function parseArgs(argv: string[]): { transport?: "stdio" | "http" } {
  const out: { transport?: "stdio" | "http" } = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--transport" && argv[i + 1]) {
      const t = argv[i + 1];
      if (t === "stdio" || t === "http") out.transport = t;
      i += 1;
    }
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const deps = createMemWalMcpDepsFromEnv(
    args.transport ? { transport: args.transport } : undefined,
  );
  const config = resolveMcpConfig(deps.config);
  validateHttpStartupConfig(config);
  const server = createMemWalMcpServer(deps);

  if (config.transport === "http") {
    await server.startHttp();
    return;
  }
  await server.connectStdio();
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  // stderr only — stdout is MCP JSON-RPC
  console.error(`memwal-mcp fatal: ${message}`);
  process.exit(1);
});
