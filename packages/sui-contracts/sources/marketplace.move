/// List / buy MemoryPack for WAL. Escrows listed packs as children of shared Marketplace.
module memwalpp_contracts::marketplace;

use memwalpp_contracts::memory_nft::{Self, MemoryPack};
use memwalpp_contracts::royalty;
use memwalpp_contracts::wal::WAL;
use sui::coin::{Self, Coin};
use sui::dynamic_object_field as dof;
use sui::event;
use sui::object::{Self, ID, UID};
use sui::table::{Self, Table};
use sui::transfer;
use sui::tx_context::{Self, TxContext};

public struct Marketplace has key {
    id: UID,
    prices: Table<ID, u64>,
    sellers: Table<ID, address>,
}

public struct PackListed has copy, drop {
    pack_id: ID,
    seller: address,
    price_mist: u64,
}

public struct PackSold has copy, drop {
    pack_id: ID,
    buyer: address,
    seller: address,
    price_mist: u64,
    marketplace_fee_mist: u64,
    royalty_mist: u64,
}

fun init(ctx: &mut TxContext) {
    let market = Marketplace {
        id: object::new(ctx),
        prices: table::new(ctx),
        sellers: table::new(ctx),
    };
    transfer::share_object(market);
}

/// Minimum listing price to avoid dust (configurable off-chain in UI).
const EPriceTooLow: u64 = 1;
const ENotListed: u64 = 2;
const ENotSeller: u64 = 3;

public fun list_pack(
    market: &mut Marketplace,
    mut pack: MemoryPack,
    price_mist: u64,
    ctx: &mut TxContext,
) {
    assert!(price_mist > 0, EPriceTooLow);
    let seller = tx_context::sender(ctx);
    let pack_id = memory_nft::id(&pack);
    memory_nft::set_listed(&mut pack, true);
    dof::add(&mut market.id, pack_id, pack);
    table::add(&mut market.prices, pack_id, price_mist);
    table::add(&mut market.sellers, pack_id, seller);
    event::emit(PackListed {
        pack_id,
        seller,
        price_mist,
    });
}

public fun cancel_listing(
    market: &mut Marketplace,
    pack_id: ID,
    ctx: &mut TxContext,
) {
    assert!(table::contains(&market.prices, pack_id), ENotListed);
    let seller = *table::borrow(&market.sellers, pack_id);
    assert!(seller == tx_context::sender(ctx), ENotSeller);
    table::remove(&mut market.prices, pack_id);
    table::remove(&mut market.sellers, pack_id);
    let mut pack: MemoryPack = dof::remove(&mut market.id, pack_id);
    memory_nft::set_listed(&mut pack, false);
    memory_nft::share_to_sender(pack, ctx);
}

public fun buy_pack(
    market: &mut Marketplace,
    pack_id: ID,
    payment: &mut Coin<WAL>,
    ctx: &mut TxContext,
): MemoryPack {
    assert!(table::contains(&market.prices, pack_id), ENotListed);
    let price = *table::borrow(&market.prices, pack_id);
    let seller = *table::borrow(&market.sellers, pack_id);
    assert!(coin::value(payment) >= price, EPriceTooLow);
    let fee_mist = royalty::take_fee(price);
    let mut pack: MemoryPack = dof::remove(&mut market.id, pack_id);
    let royalty_mist = royalty::take_royalty(price, memory_nft::royalty_bps(&pack));
    let buyer = tx_context::sender(ctx);
    let mut paid = coin::split(payment, price, ctx);
    let fee_coin = coin::split(&mut paid, fee_mist, ctx);
    let royalty_coin = coin::split(&mut paid, royalty_mist, ctx);
    let creator = memory_nft::creator(&pack);
    transfer::public_transfer(fee_coin, creator);
    transfer::public_transfer(royalty_coin, creator);
    transfer::public_transfer(paid, seller);
    table::remove(&mut market.prices, pack_id);
    table::remove(&mut market.sellers, pack_id);
    memory_nft::set_listed(&mut pack, false);
    event::emit(PackSold {
        pack_id,
        buyer,
        seller,
        price_mist: price,
        marketplace_fee_mist: fee_mist,
        royalty_mist,
    });
    pack
}
