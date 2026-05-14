/** Memory Kiosk (ADR-009): placeholder rows until indexer API is wired. */

export default function KioskPage() {
  const placeholder = [
    { packId: "0x…demo1", seller: "0x…aa", priceMist: "1000000000" },
    { packId: "0x…demo2", seller: "0x…bb", priceMist: "2500000000" },
  ];
  return (
    <main style={{ padding: "2rem", maxWidth: 900 }}>
      <h1>Memory Kiosk</h1>
      <p style={{ opacity: 0.8 }}>
        Listings will load from the Postgres indexer (`docs/specs/indexer-schema.sql`). Connect your wallet from the
        dApp Kit wallet menu when integrated on this page.
      </p>
      <ul>
        {placeholder.map((row) => (
          <li key={row.packId} style={{ marginBottom: 8 }}>
            <strong>{row.packId}</strong> — seller {row.seller} — price {row.priceMist} mist WAL
          </li>
        ))}
      </ul>
    </main>
  );
}
