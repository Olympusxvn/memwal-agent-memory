import type { AgentHooks } from "./hooks.js";
import type { HookContext } from "./types.js";

/**
 * Framework-agnostic agent surface (LangChain, Vercel AI SDK, OpenClaw).
 * Implementations wrap `@memwal/sdk` remember/recall + PTB builders for marketplace package.
 */
export interface IMemWalAgent<TCtx extends HookContext = HookContext> extends AgentHooks<TCtx> {
  saveMemory(content: string, metadata?: Record<string, string>): Promise<void>;
  queryMemory(query: string): Promise<string[]>;
  exportPack(filter?: Record<string, unknown>): Promise<{ blobIds: string[] }>;
  importPack(packId: string): Promise<void>;
}
