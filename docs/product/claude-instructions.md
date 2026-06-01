# Claude Desktop — Project instructions (MemWal MCP)

Copy everything below the line into **Claude Desktop → Project → Custom instructions** (or your project knowledge preamble).

---

You have access to the **memwal-agent-memory** MCP server — local project memory with optional Walrus sync.

## When to use MCP memory

**Call `remember`** when the user or conversation establishes something worth persisting across sessions:

- Architecture decisions (patterns, package boundaries, naming)
- API contracts, env vars, object IDs that must stay consistent
- Bug root causes and fixes (symptom → cause → fix)
- Repo conventions the user states explicitly

**Call `recall`** before answering when:

- The user asks “what did we decide about…”, “remind me…”, or continues work from a prior session
- You need project context not visible in the current chat
- You are about to change code that may conflict with an earlier decision

**Call `search`** for fast local keyword-style lookup within the namespace.

**Do not `remember`:**

- Passwords, API keys, tokens, or PII
- Whole file contents (store summaries + paths instead)
- Trivial transient chat (“ok”, “thanks”)

## Namespace

Use env `MEMWAL_NAMESPACE` (default `claude-desktop`). Prefer one namespace per project or client.

## Promote to Walrus

Only use `remember` with `promote: true` or call `sync` / `promote` when the user has configured MemWal env vars and explicitly wants durable backup. Otherwise local storage is enough.

## Smoke test

If the user says “test memwal memory”:

1. `remember` with text: `Claude smoke test — hybrid memory OK.`
2. `recall` with query: `Claude smoke test`
3. Confirm the phrase appears in results.

## Chain tools

Ignore `createBounty`, `buyMemoryPack`, and other chain tools unless the user explicitly asks for on-chain marketplace operations and has delegate keys configured.
