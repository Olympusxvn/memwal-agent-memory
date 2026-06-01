/// Fee + royalty math (basis points). Caps enforced at mint time on NFT (memory_nft).
module memwalpp_contracts::royalty;

use memwalpp_contracts::admin::{Self, Config};
use memwalpp_contracts::constants;
use memwalpp_contracts::events;
use memwalpp_contracts::memory_ext::Lineage;
use sui::coin::{Self, Coin};
use sui::object::ID;
use sui::transfer;
use sui::tx_context::TxContext;
use memwalpp_contracts::wal::WAL;

const MARKETPLACE_FEE_BPS: u64 = 250; // 2.5%
const BPS_DENOM: u64 = 10000;

public fun marketplace_fee_bps(): u64 {
    MARKETPLACE_FEE_BPS
}

public fun take_fee(amount: u64): u64 {
    amount * MARKETPLACE_FEE_BPS / BPS_DENOM
}

public fun take_royalty(amount: u64, royalty_bps: u16): u64 {
    (amount as u128 * (royalty_bps as u128) / (BPS_DENOM as u128)) as u64
}

/// Live fee from shared Config (v2).
public fun take_fee_with_config(config: &Config, amount: u64): u64 {
    let bps = admin::marketplace_fee_bps(config) as u64;
    amount * bps / constants::bps_denom()
}

/// Split payment: fee, creator royalty, lineage pool (depth decay), remainder to seller.
public fun split_fee_and_royalties(
    payment: &mut Coin<WAL>,
    price: u64,
    pack_id: ID,
    creator: address,
    seller: address,
    royalty_bps: u16,
    lineage: Lineage,
    config: &Config,
    ctx: &mut TxContext,
): (u64, u64, u64) {
    let fee_mist = take_fee_with_config(config, price);
    let royalty_mist = take_royalty(price, royalty_bps);
    assert!(coin::value(payment) >= price, constants::err_price_too_low());

    let mut paid = coin::split(payment, price, ctx);
    if (fee_mist > 0) {
        let fee_coin = coin::split(&mut paid, fee_mist, ctx);
        transfer::public_transfer(fee_coin, creator);
    };
    if (royalty_mist > 0) {
        let royalty_coin = coin::split(&mut paid, royalty_mist, ctx);
        transfer::public_transfer(royalty_coin, creator);
    };
    let lineage_paid = distribute_lineage_royalty(
        &mut paid,
        pack_id,
        price,
        &lineage,
        ctx,
    );
    assert!(
        fee_mist + royalty_mist + lineage_paid <= price,
        constants::err_split_overflow(),
    );
    transfer::public_transfer(paid, seller);
    (fee_mist, royalty_mist, lineage_paid)
}

fun distribute_lineage_royalty(
    paid: &mut Coin<WAL>,
    pack_id: ID,
    price: u64,
    lineage: &Lineage,
    ctx: &mut TxContext,
): u64 {
    let ancestors = memwalpp_contracts::memory_ext::lineage_ancestors(lineage);
    if (vector::is_empty(&ancestors)) {
        return 0
    };
    let pool = take_royalty(price, constants::lineage_pool_bps());
    if (pool == 0) {
        return 0
    };
    let len = vector::length(&ancestors);
    let mut total_paid = 0u64;
    let mut depth = 0u64;
    while (depth < len) {
        let shift = ((depth + 1) as u8);
        let divisor = 1u64 << shift;
        let share = pool / divisor;
        if (share > 0 && coin::value(paid) >= share) {
            let coin_out = coin::split(paid, share, ctx);
            let recipient = *vector::borrow(&ancestors, depth);
            transfer::public_transfer(coin_out, recipient);
            events::emit_lineage_royalty_paid(pack_id, recipient, share, depth as u16);
            total_paid = total_paid + share;
        };
        depth = depth + 1;
    };
    total_paid
}

