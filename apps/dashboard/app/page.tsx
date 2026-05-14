import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: "2rem", maxWidth: 720 }}>
      <h1>MemWal++</h1>
      <p>Marketplace UI — connect wallet and browse Memory Kiosk listings.</p>
      <p>
        <Link href="/kiosk">Open Memory Kiosk →</Link>
      </p>
      <p style={{ fontSize: 12, opacity: 0.7 }}>
        Package: <code>{process.env.NEXT_PUBLIC_MARKETPLACE_PACKAGE_ID ?? "(set env)"}</code>
      </p>
    </main>
  );
}
