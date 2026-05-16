import Link from "next/link";
import { SiteHeader } from "../../components/SiteHeader";

export default function KioskPage() {
  const placeholder = [
    { packId: "0x…demo1", seller: "0x…aa", priceMist: "1000000000" },
    { packId: "0x…demo2", seller: "0x…bb", priceMist: "2500000000" },
  ];

  return (
    <>
      <SiteHeader />
      <main className="page">
        <section className="section">
          <h1 className="section__title">Memory Kiosk</h1>
          <p className="section__subtitle">
            Placeholder listings until the Postgres indexer is wired. Connect your wallet in the header (mainnet).
          </p>
          <ul className="demo-steps">
            {placeholder.map((row) => (
              <li key={row.packId}>
                <strong>{row.packId}</strong> — seller {row.seller} — {row.priceMist} mist WAL
              </li>
            ))}
          </ul>
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
