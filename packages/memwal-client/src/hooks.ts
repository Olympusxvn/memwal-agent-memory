import type { HookContext } from "./types.js";

export interface AgentHooks<TCtx extends HookContext = HookContext> {
  /** Inject recall / strip PII before model call (ADR-011). */
  beforeModelCall(ctx: TCtx, prompt: string): Promise<string>;
  /** Auto-capture, enqueue Walrus sync, schedule outcome events (ADR-005). */
  afterModelCall(ctx: TCtx, response: string): Promise<void>;
}
