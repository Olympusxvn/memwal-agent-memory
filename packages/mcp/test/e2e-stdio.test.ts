/**
 * End-to-end stdio MCP test — spawns the real server process and exercises
 * initialize → tools/list → remember → recall → getStats (OpenSpec §13).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const repoRoot = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function parseToolJson(result: { content?: Array<{ type: string; text?: string }> }): Record<string, unknown> {
  const block = result.content?.find((c) => c.type === "text");
  if (!block?.text) throw new Error("tool result missing text content");
  return JSON.parse(block.text) as Record<string, unknown>;
}

describe("MCP stdio E2E", () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    transport = new StdioClientTransport({
      command: pnpmCmd,
      args: ["exec", "tsx", "packages/mcp/src/cli.ts", "--transport", "stdio"],
      cwd: repoRoot,
      env: {
        ...process.env,
        MEMWAL_NAMESPACE: "mcp-e2e",
        MCP_TRANSPORT: "stdio",
        MEMWAL_MCP_USE_MEMORY: "1",
      },
      stderr: "pipe",
    });

    client = new Client({ name: "mcp-e2e-test", version: "1.0.0" });
    await client.connect(transport);
  }, 30_000);

  afterAll(async () => {
    await client.close();
    await transport.close();
  });

  it("serverInfo is memwal-agent-memory", () => {
    const version = client.getServerVersion();
    expect(version?.name).toBe("memwal-agent-memory");
  });

  it("tools/list includes core memory tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    for (const tool of ["remember", "recall", "search", "sync", "getStats"]) {
      expect(names).toContain(tool);
    }
  });

  it("remember → recall round-trip", async () => {
    const unique = `e2e-walrus-bounty-${Date.now()}`;
    const rememberResult = await client.callTool({
      name: "remember",
      arguments: {
        content: `${unique}: hybrid memory MCP integration test with enough length for quality.`,
        tags: ["e2e", "mcp"],
      },
    });
    const remembered = parseToolJson(rememberResult);
    expect(remembered.stored).toBe(true);
    expect(typeof remembered.recordId).toBe("string");

    const recallResult = await client.callTool({
      name: "recall",
      arguments: { query: unique, limit: 5 },
    });
    const recalled = parseToolJson(recallResult);
    const hits = recalled.hits as Array<{ content?: string }>;
    expect(Array.isArray(hits)).toBe(true);
    expect(hits.some((h) => h.content?.includes(unique))).toBe(true);
  });

  it("getStats reports local rows", async () => {
    const statsResult = await client.callTool({ name: "getStats", arguments: {} });
    const stats = parseToolJson(statsResult);
    expect(stats.namespace).toBe("mcp-e2e");
    expect(Number(stats.localRows)).toBeGreaterThan(0);
  });

  it("createBounty returns chain_not_configured without delegate env", async () => {
    const result = await client.callTool({
      name: "createBounty",
      arguments: { description: "E2E chain skip test bounty description." },
    });
    const body = parseToolJson(result);
    expect(body.skipReason).toBe("chain_not_configured");
  });
});
