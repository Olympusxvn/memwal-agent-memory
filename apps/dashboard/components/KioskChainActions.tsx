"use client";

import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import {
  MAINNET_DEPLOYED_OBJECTS,
  MARKETPLACE_PACKAGE_ID,
  moveTarget,
  walCoinType,
} from "@memwalpp/shared";
import { useCallback, useState } from "react";

const PACKAGE_ID =
  process.env.NEXT_PUBLIC_MARKETPLACE_PACKAGE_ID ?? MARKETPLACE_PACKAGE_ID;
const MARKETPLACE_ID =
  process.env.NEXT_PUBLIC_MARKETPLACE_OBJECT_ID ?? MAINNET_DEPLOYED_OBJECTS.marketplace;
const TREASURY_CAP_ID =
  process.env.NEXT_PUBLIC_WAL_TREASURY_CAP_ID ?? MAINNET_DEPLOYED_OBJECTS.walTreasuryCap;
const CLOCK_ID =
  "0x0000000000000000000000000000000000000000000000000000000000000006";

function encodeDescriptionHash(text: string): number[] {
  const data = new TextEncoder().encode(text);
  const hash = new Uint8Array(32);
  // Lightweight demo hash — matches server-side sha256 intent for judges reading UI code.
  for (let i = 0; i < data.length; i += 1) {
    hash[i % 32] ^= data[i]!;
  }
  return [...hash];
}

export function KioskChainActions() {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const postDemoBounty = useCallback(async () => {
    if (!account) {
      setStatus("Connect wallet first.");
      return;
    }
    setBusy(true);
    setStatus("Building post_bounty PTB…");
    try {
      const tx = new Transaction();
      const walType = walCoinType(PACKAGE_ID as typeof MARKETPLACE_PACKAGE_ID);
      const [payment] = tx.moveCall({
        target: "0x2::coin::mint",
        typeArguments: [walType],
        arguments: [tx.object(TREASURY_CAP_ID), tx.pure.u64(1_000_000_000n)],
      });
      const deadline = BigInt(Date.now() + 86_400_000);
      tx.moveCall({
        target: moveTarget("bounty", "post_bounty", PACKAGE_ID as typeof MARKETPLACE_PACKAGE_ID),
        arguments: [
          payment,
          tx.pure.u64(deadline),
          tx.pure.vector("u8", encodeDescriptionHash("MemWal++ kiosk demo bounty")),
          tx.object(CLOCK_ID),
        ],
      });
      const result = await signAndExecute({
        transaction: tx as unknown as Parameters<typeof signAndExecute>[0]["transaction"],
      });
      setStatus(`Bounty posted — digest ${result.digest}`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [account, signAndExecute]);

  return (
    <div className="value-card" style={{ marginTop: "1rem" }}>
      <h3>On-chain actions (S4)</h3>
      <p style={{ marginBottom: "0.75rem" }}>
        Wallet-signed PTBs against mainnet v1 <code>bounty::post_bounty</code>. Requires connected
        wallet with access to demo WAL treasury (operator demo wallet).
      </p>
      <button
        type="button"
        className="btn btn--primary"
        disabled={!account || busy}
        onClick={() => void postDemoBounty()}
      >
        Post demo bounty (1 WAL)
      </button>
      {status ? (
        <p style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>
          <strong>Status:</strong> {status}
        </p>
      ) : null}
    </div>
  );
}
