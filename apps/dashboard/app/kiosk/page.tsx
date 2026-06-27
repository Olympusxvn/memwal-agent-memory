import Link from "next/link";
import { SiteHeader } from "../../components/SiteHeader";
import { KioskChainActions } from "../../components/KioskChainActions";

export default function KioskPage() {
  return (
    <>
      <SiteHeader />
      <main className="page">
        <section className="section">
          <h1 className="section__title">Memory Kiosk</h1>
          <p className="section__subtitle">
            Connect wallet (mainnet) for live PTBs. Pack listings require the production indexer
            (Phase P3 backlog) — chain actions below are real; marketplace browse is not faked here.
          </p>
          <div className="value-card" style={{ marginBottom: "1.25rem" }}>
            <p>
              <strong>Indexer pending</strong> — no placeholder pack rows. Use{" "}
              <code>post_bounty</code> / <code>buy_pack</code> PTBs when your wallet is connected, or
              run <code>pnpm agent:bounty-hunt</code> for the offline swarm narrative.
            </p>
          </div>
          <KioskChainActions />
          <p style={{ marginTop: "1.5rem" }}>
            <Link className="btn btn--secondary" href="/">
              ← Back to home
            </Link>
          </p>
        </section>
      </main>
    </>
  );
}
