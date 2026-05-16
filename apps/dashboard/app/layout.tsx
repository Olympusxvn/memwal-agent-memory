import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "MemWal++ — Hybrid Agent Memory · Walrus Track",
  description:
    "Local-first agent memory with Walrus durable storage, MemWal integration, and Sui Move marketplace — Sui Overflow 2026.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
