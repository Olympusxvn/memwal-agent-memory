/// Native WAL placeholder minted at publish for demos.
/// Swap treasury/metadata IDs via env for production WAL token per ADR-003.
module memwalpp_contracts::wal;

use std::option;
use sui::coin::{Self, Coin, TreasuryCap};
use sui::transfer;
use sui::tx_context::{Self, TxContext};

/// OTW type for WAL currency in this package (demo/testnet convenience).
public struct WAL has drop {}

fun init(otw: WAL, ctx: &mut TxContext) {
    let (treasury_cap, metadata) = coin::create_currency(
        otw,
        9,
        b"WAL",
        b"MemWalPP WAL",
        b"Placeholder WAL for MemWal++ marketplace tests",
        option::none(),
        ctx,
    );
    transfer::public_freeze_object(metadata);
    transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
}

#[test_only]
/// Mint demo WAL in unit tests (TreasuryCap from package init).
public fun mint_for_test(
    treasury: &mut TreasuryCap<WAL>,
    amount: u64,
    ctx: &mut TxContext,
): Coin<WAL> {
    coin::mint(treasury, amount, ctx)
}
