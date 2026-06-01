"use client";

import { ConnectButton } from "@mysten/dapp-kit";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

const REPO = "https://github.com/Olympusxvn/memwal-agent-memory";
const LIVE_DEMO = "https://memwalpp-dashboard.vercel.app/";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="site-header__brand">
          <span className="site-header__mark" aria-hidden>
            M+
          </span>
          <span>
            MemWal++
            <span className="site-header__brand-sub">memwal-agent-memory</span>
          </span>
        </Link>
        <nav className="site-header__nav" aria-label="Main">
          <a href={LIVE_DEMO} target="_blank" rel="noopener noreferrer">
            Live demo
          </a>
          <Link href="/kiosk">Memory Kiosk</Link>
          <a href={`${REPO}/blob/main/JUDGE_GUIDE.md`} target="_blank" rel="noopener noreferrer">
            Judge guide
          </a>
          <a href={REPO} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </nav>
        <div className="site-header__actions">
          <ThemeToggle />
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
