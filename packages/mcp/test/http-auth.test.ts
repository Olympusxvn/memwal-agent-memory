import { describe, expect, it } from "vitest";

import {
  assertAuthorized,
  McpAuthError,
  resolveBearerToken,
} from "../src/middleware/auth.js";
import { resolveMcpConfig, validateHttpStartupConfig } from "../src/runtime/create-deps.js";
import type { ToolSession } from "../src/types.js";

describe("HTTP auth (S-5, T-3)", () => {
  it("resolveBearerToken accepts matching Bearer header", () => {
    expect(resolveBearerToken("Bearer secret-token", "secret-token")).toBe(true);
    expect(resolveBearerToken("bearer secret-token", "secret-token")).toBe(true);
  });

  it("resolveBearerToken rejects missing or wrong token", () => {
    expect(resolveBearerToken(undefined, "secret-token")).toBe(false);
    expect(resolveBearerToken("Bearer wrong", "secret-token")).toBe(false);
    expect(resolveBearerToken("Bearer x", undefined)).toBe(false);
  });

  it("assertAuthorized allows read tools without HTTP auth", () => {
    const session: ToolSession = { id: "s1", authorized: false, transport: "http" };
    expect(() => assertAuthorized(session, "getStats")).not.toThrow();
    expect(() => assertAuthorized(session, "recall")).not.toThrow();
  });

  it("assertAuthorized blocks mutating/durable tools without bearer session", () => {
    const session: ToolSession = { id: "s1", authorized: false, transport: "http" };
    expect(() => assertAuthorized(session, "remember")).toThrow(McpAuthError);
    expect(() => assertAuthorized(session, "sync")).toThrow(McpAuthError);
  });

  it("assertAuthorized allows mutating tools when session is authorized", () => {
    const session: ToolSession = { id: "s1", authorized: true, transport: "http" };
    expect(() => assertAuthorized(session, "remember")).not.toThrow();
    expect(() => assertAuthorized(session, "sync")).not.toThrow();
  });

  it("validateHttpStartupConfig requires token when requireAuth is on", () => {
    const config = resolveMcpConfig({
      transport: "http",
      http: { host: "127.0.0.1", port: 8787, requireAuth: true },
    });
    expect(() => validateHttpStartupConfig(config)).toThrow(/MCP_HTTP_TOKEN/);
  });

  it("validateHttpStartupConfig passes when token is configured", () => {
    const config = resolveMcpConfig({
      transport: "http",
      http: {
        host: "127.0.0.1",
        port: 8787,
        requireAuth: true,
        bearerToken: "test",
      },
    });
    expect(() => validateHttpStartupConfig(config)).not.toThrow();
  });

  it("validateHttpStartupConfig requires allowedHosts for 0.0.0.0 bind", () => {
    const config = resolveMcpConfig({
      transport: "http",
      http: {
        host: "0.0.0.0",
        port: 8787,
        requireAuth: true,
        bearerToken: "test",
      },
    });
    expect(() => validateHttpStartupConfig(config)).toThrow(/MCP_HTTP_ALLOWED_HOSTS/);
  });
});
