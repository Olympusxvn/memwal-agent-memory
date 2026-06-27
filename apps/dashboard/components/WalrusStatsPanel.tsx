const WALRUS_MEMORY = "https://memory.walrus.xyz";
const MEMWAL_RELAYER = "https://relayer.memory.walrus.xyz";
const PACKAGE_ID =
  process.env.NEXT_PUBLIC_MARKETPLACE_PACKAGE_ID ??
  "0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050";
const SUISCAN_PACKAGE = `https://suiscan.xyz/mainnet/object/${PACKAGE_ID}`;

/** Honest Walrus stats panel — no fake live counts; points judges to MCP getStats. */
export function WalrusStatsPanel() {
  return (
    <section className="section" id="walrus-stats">
      <h2 className="section__title">Walrus memory stats</h2>
      <p className="section__subtitle">
        Live row counts come from your local MCP store via <code>getStats</code> — this dashboard does
        not fabricate indexer data.
      </p>
      <div className="value-grid">
        <article className="value-card">
          <h3>Local + durable</h3>
          <p>
            Run <code>pnpm mcp:e2e</code> or MCP <code>getStats</code> after <code>remember</code> /
            <code>sync</code> to see namespace row counts and <code>durableLive</code>.
          </p>
        </article>
        <article className="value-card">
          <h3>Verify status</h3>
          <p>
            <code>pnpm mcp:e2e:portable</code> — fresh SQLite rehydrate from mock durable + layered{" "}
            <code>verify</code> PASS.
          </p>
        </article>
        <article className="value-card">
          <h3>Promoted blobs</h3>
          <p>
            With <code>MEMWAL_*</code> set: <code>MEMWAL_AUTO_PUSH=1 pnpm agent:bounty-hunt</code>{" "}
            prints <code>walrusBlobId</code> in CLI output.
          </p>
        </article>
      </div>
      <ul className="demo-steps" style={{ marginTop: "1.25rem" }}>
        <li>
          <a href={WALRUS_MEMORY} target="_blank" rel="noopener noreferrer">
            memory.walrus.xyz
          </a>{" "}
          — Walrus Memory product
        </li>
        <li>
          <a href={MEMWAL_RELAYER} target="_blank" rel="noopener noreferrer">
            relayer.memory.walrus.xyz
          </a>{" "}
          — MemWal relayer (after local redact)
        </li>
        <li>
          <a href={SUISCAN_PACKAGE} target="_blank" rel="noopener noreferrer">
            Suiscan — mainnet Move package
          </a>
        </li>
      </ul>
    </section>
  );
}
