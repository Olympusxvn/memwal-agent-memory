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

async function descriptionHashBytes(text: string): Promise<number[]> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)];
}

async function walrusBlobIdFromString(blobId: string): Promise<string> {
  const trimmed = blobId.trim();
  if (trimmed.startsWith("0x") && trimmed.length === 66) return trimmed;
  const data = new TextEncoder().encode(trimmed);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 64);
  return `0x${hex}`;
}

type TxResult = Parameters<typeof useSignAndExecuteTransaction>[0] extends {
  mutateAsync: (args: infer A) => unknown;
}
  ? A
  : never;

export function KioskChainActions() {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [bountyId, setBountyId] = useState("");
  const [walrusBlobId, setWalrusBlobId] = useState("");
  const [packId, setPackId] = useState("");
  const [priceMist, setPriceMist] = useState("1000000000");

  const runTx = useCallback(
    async (label: string, build: () => Promise<Transaction>) => {
      if (!account) {
        setStatus("Connect wallet first.");
        return;
      }
      setBusy(true);
      setStatus(`Building ${label}…`);
      try {
        const tx = await build();
        const result = await signAndExecute({
          transaction: tx as unknown as TxResult["transaction"],
        });
        setStatus(`${label} — digest ${result.digest}`);
      } catch (err) {
        setStatus(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [account, signAndExecute],
  );

  const postDemoBounty = useCallback(async () => {
    await runTx("post_bounty", async () => {
      const tx = new Transaction();
      const walType = walCoinType(PACKAGE_ID as typeof MARKETPLACE_PACKAGE_ID);
      const [payment] = tx.moveCall({
        target: "0x2::coin::mint",
        typeArguments: [walType],
        arguments: [tx.object(TREASURY_CAP_ID), tx.pure.u64(1_000_000_000n)],
      });
      const hash = await descriptionHashBytes("MemWal++ kiosk demo bounty");
      tx.moveCall({
        target: moveTarget("bounty", "post_bounty", PACKAGE_ID as typeof MARKETPLACE_PACKAGE_ID),
        arguments: [
          payment,
          tx.pure.u64(BigInt(Date.now() + 86_400_000)),
          tx.pure.vector("u8", hash),
          tx.object(CLOCK_ID),
        ],
      });
      return tx;
    });
  }, [runTx]);

  const submitFulfillment = useCallback(async () => {
    if (!bountyId.trim() || !walrusBlobId.trim()) {
      setStatus("Enter bounty object id and Walrus blob id.");
      return;
    }
    await runTx("submit_fulfillment", async () => {
      const tx = new Transaction();
      const blobObjectId = await walrusBlobIdFromString(walrusBlobId);
      tx.moveCall({
        target: moveTarget(
          "bounty",
          "submit_fulfillment",
          PACKAGE_ID as typeof MARKETPLACE_PACKAGE_ID,
        ),
        arguments: [
          tx.object(bountyId.trim()),
          tx.pure.id(blobObjectId),
          tx.object(CLOCK_ID),
        ],
      });
      return tx;
    });
  }, [bountyId, walrusBlobId, runTx]);

  const buyListedPack = useCallback(async () => {
    if (!packId.trim()) {
      setStatus("Enter listed pack object id.");
      return;
    }
    const price = BigInt(priceMist || "0");
    if (price <= 0n) {
      setStatus("Enter a positive price in mist.");
      return;
    }
    await runTx("buy_pack", async () => {
      const tx = new Transaction();
      const walType = walCoinType(PACKAGE_ID as typeof MARKETPLACE_PACKAGE_ID);
      const [payment] = tx.moveCall({
        target: "0x2::coin::mint",
        typeArguments: [walType],
        arguments: [tx.object(TREASURY_CAP_ID), tx.pure.u64(price)],
      });
      const bought = tx.moveCall({
        target: moveTarget("marketplace", "buy_pack", PACKAGE_ID as typeof MARKETPLACE_PACKAGE_ID),
        arguments: [tx.object(MARKETPLACE_ID), tx.pure.id(packId.trim()), payment],
      });
      tx.transferObjects([bought], account!.address);
      return tx;
    });
  }, [packId, priceMist, account, runTx]);

  return (
    <div className="value-card" style={{ marginTop: "1rem" }}>
      <h3>On-chain actions (S4)</h3>
      <p style={{ marginBottom: "0.75rem" }}>
        Wallet-signed PTBs against mainnet v1 contracts. Demo WAL is minted from the package
        treasury cap (operator demo wallet).
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
        <button
          type="button"
          className="btn btn--primary"
          disabled={!account || busy}
          onClick={() => void postDemoBounty()}
        >
          Post demo bounty (1 WAL)
        </button>
      </div>

      <fieldset style={{ border: "1px solid var(--border, #333)", padding: "1rem", marginBottom: "1rem" }}>
        <legend>Submit bounty fulfillment</legend>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          Bounty object id
          <input
            className="input"
            style={{ display: "block", width: "100%", marginTop: "0.25rem" }}
            value={bountyId}
            onChange={(e) => setBountyId(e.target.value)}
            placeholder="0x…"
          />
        </label>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          Walrus blob id
          <input
            className="input"
            style={{ display: "block", width: "100%", marginTop: "0.25rem" }}
            value={walrusBlobId}
            onChange={(e) => setWalrusBlobId(e.target.value)}
            placeholder="blob id or 0x… object id"
          />
        </label>
        <button
          type="button"
          className="btn btn--secondary"
          disabled={!account || busy}
          onClick={() => void submitFulfillment()}
        >
          Submit fulfillment
        </button>
      </fieldset>

      <fieldset style={{ border: "1px solid var(--border, #333)", padding: "1rem" }}>
        <legend>Buy listed MemoryPack</legend>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          Pack object id
          <input
            className="input"
            style={{ display: "block", width: "100%", marginTop: "0.25rem" }}
            value={packId}
            onChange={(e) => setPackId(e.target.value)}
            placeholder="0x…"
          />
        </label>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          Price (mist)
          <input
            className="input"
            style={{ display: "block", width: "100%", marginTop: "0.25rem" }}
            value={priceMist}
            onChange={(e) => setPriceMist(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="btn btn--secondary"
          disabled={!account || busy}
          onClick={() => void buyListedPack()}
        >
          Buy pack
        </button>
      </fieldset>

      {status ? (
        <p style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>
          <strong>Status:</strong> {status}
        </p>
      ) : null}
    </div>
  );
}
