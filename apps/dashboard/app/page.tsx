import Link from "next/link";
import { DemoCommands } from "../components/DemoCommands";
import { SiteHeader } from "../components/SiteHeader";

const PACKAGE_ID =
  process.env.NEXT_PUBLIC_MARKETPLACE_PACKAGE_ID ??
  "0x48db008a3c9e638dd17d20702632d9909c3c075e44eb339f890fb29503ec3050";

const REPO = "https://github.com/Olympusxvn/memwal-agent-memory";
const LIVE_DEMO = "https://memwalpp-dashboard.vercel.app/";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="page">
        <section className="hero">
          <div className="hero__badges">
            <span className="badge badge--walrus">Walrus Track</span>
            <span className="badge badge--sui">Sui Overflow 2026</span>
            <span className="badge badge--live">Live demo</span>
          </div>
          <h1>Local speed. Walrus truth. On-chain economy.</h1>
          <p className="hero__lead">
            <strong>MemWal++</strong> (<code>memwal-agent-memory</code>) is a hybrid verifiable memory layer for
            autonomous agents: recall from SQLite locally, promote redacted rows to MemWal and Walrus, and anchor memory
            packs and bounties on Sui Move with verifiable <code>walrus_blob_id</code> fulfillment.
          </p>
          <div className="hero__cta">
            <a className="btn btn--primary" href={LIVE_DEMO} target="_blank" rel="noopener noreferrer">
              Open live demo
            </a>
            <a className="btn btn--secondary" href="#demo">
              Run judge demo
            </a>
            <Link className="btn btn--secondary" href="/kiosk">
              Memory Kiosk
            </Link>
            <Link className="btn btn--secondary" href="/summary">
              Project summary
            </Link>
            <Link className="btn btn--secondary" href="/doc-hub">
              Doc Hub
            </Link>
            <Link className="btn btn--primary" href="/product">
              MCP for Cursor & Claude
            </Link>
            <a
              className="btn btn--ghost"
              href={`${REPO}/blob/main/JUDGE_GUIDE.md`}
              target="_blank"
              rel="noopener noreferrer"
            >
              JUDGE_GUIDE.md
            </a>
          </div>
          <div className="live-demo">
            <p className="live-demo__copy">
              Production dashboard — wallet connect, Walrus track narrative, judge commands. UI follows{" "}
              <code>walrus.xyz-DESIGN.md</code> with dark + light mode.
            </p>
            <a className="live-demo__url" href={LIVE_DEMO} target="_blank" rel="noopener noreferrer">
              {LIVE_DEMO}
            </a>
          </div>
        </section>

        <section className="section" id="walrus">
          <h2 className="section__title">Why Walrus is on the critical path</h2>
          <p className="section__subtitle">
            Not marketing copy — durable blobs and on-chain refs are required for marketplace and bounty flows.
          </p>
          <div className="flow">
            <span>LocalMemoryStore</span>
            <span className="flow__arrow">→</span>
            <span>redactForUpstream</span>
            <span className="flow__arrow">→</span>
            <span>MemWal remember</span>
            <span className="flow__arrow">→</span>
            <span>Walrus blob</span>
            <span className="flow__arrow">→</span>
            <span>walrusBlobId + Sui bounty</span>
          </div>
          <div className="value-grid" style={{ marginTop: "1.25rem" }}>
            <article className="value-card">
              <h3>Durable storage</h3>
              <p>
                <code>DurableMemoryStore.remember()</code> pushes quality-gated rows to MemWal and Walrus before agents
                share or sell memory.
              </p>
            </article>
            <article className="value-card">
              <h3>Verifiable recall</h3>
              <p>
                Semantic pull hydrates local cache; every promoted row can carry a <code>walrusBlobId</code> proof
                surface for judges and buyers.
              </p>
            </article>
            <article className="value-card">
              <h3>Agent integration</h3>
              <p>
                OpenClaw-style hooks and runnable CLIs — <code>agent:demo</code> and <code>agent:bounty-hunt</code> — exit
                0 offline with no keys.
              </p>
            </article>
            <article className="value-card">
              <h3>On-chain economy</h3>
              <p>
                MemoryPack NFTs, marketplace listings, and WAL escrow bounties with{" "}
                <code>submit_fulfillment(walrus_blob_id)</code> on Sui mainnet.
              </p>
            </article>
          </div>
        </section>

        <section className="section" id="demo">
          <h2 className="section__title">Judge demo commands</h2>
          <p className="section__subtitle">
            Clone the repo and run both agent demos. Expect colored <code>[1/N]</code> steps and exit code{" "}
            <strong>0</strong>. Optional live Walrus: set <code>MEMWAL_*</code> and <code>MEMWAL_AUTO_PUSH=1</code> (see{" "}
            <a href={`${REPO}/blob/main/.env.example`} target="_blank" rel="noopener noreferrer">
              .env.example
            </a>
            ).
          </p>
          <DemoCommands />
          <ul className="demo-steps">
            <li>
              <strong>agent:demo</strong> — seed memory, hybrid recall, hook lifecycle (local-first → optional Walrus).
            </li>
            <li>
              <strong>agent:bounty-hunt</strong> — poster + hunter agents; hybrid sync is real; bounty metadata is a{" "}
              <strong>labeled stub</strong> (Move modules + mainnet IDs are real — see SUBMISSION.md).
            </li>
            <li>
              Connect wallet on <Link href="/kiosk">Memory Kiosk</Link> for live <code>post_bounty</code> PTBs
              (operator demo wallet + treasury cap).
            </li>
          </ul>
        </section>

        <footer className="site-footer">
          <p>
            <strong>Mainnet package:</strong> <code>{PACKAGE_ID}</code>
          </p>
          <p>
            Network: <code>{process.env.NEXT_PUBLIC_SUI_NETWORK ?? "mainnet"}</code> ·{" "}
            <a href={REPO} target="_blank" rel="noopener noreferrer">
              github.com/Olympusxvn/memwal-agent-memory
            </a>
          </p>
        </footer>
      </main>
    </>
  );
}
