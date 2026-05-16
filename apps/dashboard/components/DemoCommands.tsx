"use client";

import { useCallback, useState } from "react";

const DEMO_SCRIPT = `git clone https://github.com/Olympusxvn/memwalpp.git && cd memwalpp
pnpm install
pnpm agent:demo
pnpm agent:bounty-hunt`;

export function DemoCommands() {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(DEMO_SCRIPT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, []);

  return (
    <div className="demo-block">
      <div className="demo-block__head">
        <span className="demo-block__label">Judge path — no API keys (~3 min)</span>
        <button type="button" className="btn btn--ghost" onClick={copy}>
          {copied ? "Copied" : "Copy all"}
        </button>
      </div>
      <pre>{DEMO_SCRIPT}</pre>
    </div>
  );
}
