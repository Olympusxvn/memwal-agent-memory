/**
 * E2E stdio MCP — v1 core flows (OpenSpec §13 subset):
 * 1. remember → recall
 * 2. remember → sync → recall (mock durable)
 * 3. sync enforces server-side redaction (S-1)
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const repoRoot = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const E2E_ENV = {
  ...process.env,
  MEMWAL_NAMESPACE: "mcp-e2e",
  MCP_TRANSPORT: "stdio",
  MEMWAL_MCP_USE_MEMORY: "1",
  MEMWAL_MCP_MOCK_DURABLE: "1",
  MEMWAL_SYNC_QUALITY_MIN: "0",
  MEMWAL_UPLOAD_THRESHOLD: "0",
};

function parseToolJson(result: { content?: Array<{ type: string; text?: string }> }): Record<string, unknown> {
  const block = result.content?.find((c) => c.type === "text");
  if (!block?.text) throw new Error("tool result missing text content");
  return JSON.parse(block.text) as Record<string, unknown>;
}

describe("MCP stdio E2E — v1 core flows", () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    transport = new StdioClientTransport({
      command: pnpmCmd,
      args: ["exec", "tsx", "packages/mcp/src/cli.ts", "--transport", "stdio"],
      cwd: repoRoot,
      env: E2E_ENV,
      stderr: "pipe",
    });

    client = new Client({ name: "mcp-e2e-test", version: "1.0.0" });
    await client.connect(transport);
  }, 30_000);

  afterAll(async () => {
    await client.close();
    await transport.close();
  });

  it("exposes exactly 10 v1 tools", async () => {
    expect(client.getServerVersion()?.name).toBe("memwal-agent-memory");
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(10);
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        "getLineage",
        "getStats",
        "getVersionHistory",
        "recall",
        "remember",
        "saveArtifact",
        "search",
        "softDelete",
        "sync",
        "verify",
      ].sort(),
    );
  });

  describe("flow 1: remember → recall", () => {
    it("stores locally and recalls by keyword", async () => {
      const unique = `e2e-recall-${crypto.randomUUID()}`;
      const remembered = parseToolJson(
        await client.callTool({
          name: "remember",
          arguments: {
            content: `${unique}: hybrid MCP remember recall flow with sufficient length.`,
            metadata: { source: "e2e" },
          },
        }),
      );
      expect(remembered.stored).toBe(true);
      expect(typeof remembered.recordId).toBe("string");
      expect(typeof remembered.proof).toBe("string");

      const recalled = parseToolJson(
        await client.callTool({
          name: "recall",
          arguments: { query: unique, options: { limit: 5 } },
        }),
      );
      const hits = recalled.hits as Array<{ content?: string }>;
      expect(hits.some((h) => h.content?.includes(unique))).toBe(true);

      const verified = parseToolJson(
        await client.callTool({
          name: "verify",
          arguments: { proof: remembered.proof as string },
        }),
      );
      expect(verified.valid).toBe(true);
    });
  });

  describe("flow 2: remember → sync → recall", () => {
    it("promotes to mock durable and remains recallable", async () => {
      const unique = `e2e-sync-${crypto.randomUUID()}`;
      const remembered = parseToolJson(
        await client.callTool({
          name: "remember",
          arguments: {
            content: `${unique}: durable sync e2e memory with enough text for quality gate.`,
          },
        }),
      );
      expect(remembered.stored).toBe(true);

      const synced = parseToolJson(
        await client.callTool({
          name: "sync",
          arguments: { forceDurable: false },
        }),
      );
      expect(synced.durableLive).toBe(true);
      const metrics = synced.metrics as { pushed?: number };
      expect(Number(metrics.pushed)).toBeGreaterThanOrEqual(1);

      const recalled = parseToolJson(
        await client.callTool({
          name: "recall",
          arguments: { query: unique, options: { limit: 5 } },
        }),
      );
      const hits = recalled.hits as Array<{ id?: string; content?: string; synced?: boolean; walrusBlobId?: string }>;
      const hit = hits.find((h) => h.content?.includes(unique));
      expect(hit).toBeDefined();
      expect(hit?.synced).toBe(true);
      expect(typeof hit?.walrusBlobId).toBe("string");

      const stats = parseToolJson(await client.callTool({ name: "getStats", arguments: {} }));
      expect(Number(stats.syncedRows)).toBeGreaterThan(0);
    });
  });

  describe("flow 3: sync redaction (S-1)", () => {
    it("strips PII before durable write — content redacted in recall", async () => {
      const unique = `e2e-redact-${crypto.randomUUID()}`;
      const email = "pii-user@example.com";
      await client.callTool({
        name: "remember",
        arguments: {
          content: `${unique}: contact ${email} for Walrus sync redaction validation with enough length.`,
        },
      });

      await client.callTool({ name: "sync", arguments: {} });

      const recalled = parseToolJson(
        await client.callTool({
          name: "recall",
          arguments: { query: unique, options: { limit: 3 } },
        }),
      );
      const hits = recalled.hits as Array<{ content?: string }>;
      const row = hits.find((h) => h.content?.includes(unique));
      expect(row).toBeDefined();
      expect(row?.content).not.toContain(email);
      expect(row?.content).toContain("[redacted-email]");
    });
  });

  describe("flow 4: saveArtifact → sync → recall", () => {
    it("stores JSON report with artifact metadata and promotes on sync", async () => {
      const unique = `e2e-artifact-${crypto.randomUUID()}`;
      const saved = parseToolJson(
        await client.callTool({
          name: "saveArtifact",
          arguments: {
            name: `report-${unique}`,
            content: JSON.stringify({ report: unique, findings: ["hybrid", "verify"] }),
            mime: "application/json",
            promote: "walrus",
          },
        }),
      );
      expect(saved.stored).toBe(true);
      expect(saved.artifact).toBe(true);
      expect(typeof saved.recordId).toBe("string");

      const synced = parseToolJson(
        await client.callTool({
          name: "sync",
          arguments: { forceDurable: false },
        }),
      );
      expect(Number((synced.metrics as { pushed?: number }).pushed)).toBeGreaterThanOrEqual(1);

      const recalled = parseToolJson(
        await client.callTool({
          name: "recall",
          arguments: { query: unique, options: { limit: 5 } },
        }),
      );
      const hits = recalled.hits as Array<{ content?: string }>;
      const hit = hits.find((h) => h.content?.includes(unique));
      expect(hit).toBeDefined();
      expect(hit?.content).toContain("Artifact:");
    });
  });
});
