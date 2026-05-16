"use client";

import { ConnectButton } from "@mysten/dapp-kit";
import Link from "next/link";

const REPO = "https://github.com/Olympusxvn/memwalpp";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="site-header__brand">
          <span className="site-header__mark" aria-hidden>
            M+
          </span>
          MemWal++
        </Link>
        <nav className="site-header__nav" aria-label="Main">
          <Link href="/kiosk">Memory Kiosk</Link>
          <a href={`${REPO}/blob/main/JUDGE_GUIDE.md`} target="_blank" rel="noopener noreferrer">
            Judge guide
          </a>
          <a href={REPO} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </nav>
        <div className="site-header__actions">
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
