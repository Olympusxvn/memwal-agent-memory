/**
 * Streamable HTTP integration — session registry, health, auth at tool layer (1.1f).
 */
import { createMemorySyncService } from "@memwalpp/core";
import { InMemoryLocalMemoryStore } from "@memwalpp/local-memory";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createMockDurableMemoryStore } from "../src/runtime/mock-durable-store.js";
import { startHttpTransport, type HttpTransportHandle } from "../src/transport/http.js";
import type { MemWalMcpDeps } from "../src/types.js";

function parseToolJson(result: { content?: Array<{ type: string; text?: string }> }): Record<string, unknown> {
  const block = result.content?.find((c) => c.type === "text");
  if (!block?.text) throw new Error("tool result missing text content");
  return JSON.parse(block.text) as Record<string, unknown>;
}

function createHttpTestDeps(port: number): MemWalMcpDeps {
  const local = new InMemoryLocalMemoryStore();
  const durable = createMockDurableMemoryStore("http-e2e");
  const sync = createMemorySyncService({ local, durable, config: { qualityMin: 0, uploadThreshold: 0 } });
  return {
    sync,
    local,
    durable,
    config: {
      transport: "http",
      defaultNamespace: "http-e2e",
      http: {
        host: "127.0.0.1",
        port,
        requireAuth: true,
        bearerToken: "integration-test-token",
      },
      rateLimit: { maxPerMinute: 120, burst: 20, durableMaxPerMinute: 10 },
    },
  };
}

describe("MCP Streamable HTTP transport (1.1f)", () => {
  let handle: HttpTransportHandle;
  let baseUrl: URL;

  beforeAll(async () => {
    handle = await startHttpTransport(createHttpTestDeps(0));
    baseUrl = new URL(`http://127.0.0.1:${handle.port}/mcp`);
  }, 30_000);

  afterAll(async () => {
    await handle.close();
  }, 30_000);

  it("GET /health returns ok without auth", async () => {
    const res = await fetch(`http://127.0.0.1:${handle.port}/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; transport: string };
    expect(body.ok).toBe(true);
    expect(body.transport).toBe("streamable-http");
  });

  it("read tool works without Authorization header", async () => {
    const transport = new StreamableHTTPClientTransport(baseUrl);
    const client = new Client({ name: "http-read-test", version: "1.0.0" });
    await client.connect(transport);
    const result = await client.callTool({ name: "getStats", arguments: {} });
    const payload = parseToolJson(result);
    expect(payload.namespace).toBe("http-e2e");
    expect(typeof payload.localRows).toBe("number");
    await client.close();
  });

  it("mutating tool rejects without bearer token", async () => {
    const transport = new StreamableHTTPClientTransport(baseUrl);
    const client = new Client({ name: "http-unauth-mutate", version: "1.0.0" });
    await client.connect(transport);
    const result = await client.callTool({
      name: "remember",
      arguments: { content: "should fail without auth" },
    });
    expect(result.isError).toBe(true);
    expect(result.content?.[0]?.text).toMatch(/bearer token/i);
    await client.close();
  });

  it("mutating tool succeeds with valid bearer token", async () => {
    const transport = new StreamableHTTPClientTransport(baseUrl, {
      requestInit: {
        headers: { Authorization: "Bearer integration-test-token" },
      },
    });
    const client = new Client({ name: "http-auth-mutate", version: "1.0.0" });
    await client.connect(transport);
    const result = await client.callTool({
      name: "remember",
      arguments: { content: `http-auth-${crypto.randomUUID()}` },
    });
    const payload = parseToolJson(result);
    expect(payload.stored).toBe(true);
    await client.close();
  });

  it("creates independent MCP sessions per client connection", async () => {
    const healthBefore = await fetch(`http://127.0.0.1:${handle.port}/health`);
    const before = (await healthBefore.json()) as { sessions: number };

    const transportA = new StreamableHTTPClientTransport(baseUrl);
    const transportB = new StreamableHTTPClientTransport(baseUrl);
    const clientA = new Client({ name: "session-a", version: "1.0.0" });
    const clientB = new Client({ name: "session-b", version: "1.0.0" });
    await clientA.connect(transportA);
    await clientB.connect(transportB);

    expect(transportA.sessionId).toBeDefined();
    expect(transportB.sessionId).toBeDefined();
    expect(transportA.sessionId).not.toBe(transportB.sessionId);

    const healthAfter = await fetch(`http://127.0.0.1:${handle.port}/health`);
    const after = (await healthAfter.json()) as { sessions: number };
    expect(after.sessions).toBeGreaterThanOrEqual(before.sessions + 2);

    await clientA.close();
    await clientB.close();
  });
});
