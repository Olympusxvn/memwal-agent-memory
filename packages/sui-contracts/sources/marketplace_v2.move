/// Marketplace v2 — live Config fees + lineage royalty on buy.
module memwalpp_contracts::marketplace_v2;

use memwalpp_contracts::admin::{Self, AdminCap, Config};
use memwalpp_contracts::constants;
use memwalpp_contracts::events;
use memwalpp_contracts::memory_ext;
use memwalpp_contracts::memory_nft::{Self, MemoryPack};
use memwalpp_contracts::royalty;
use memwalpp_contracts::wal::WAL;
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::dynamic_object_field as dof;
use sui::object::{Self, ID, UID};
use sui::table::{Self, Table};
use sui::transfer;
use sui::tx_context::{Self, TxContext};

public struct MarketplaceV2 has key {
    id: UID,
    prices: Table<ID, u64>,
    sellers: Table<ID, address>,
}

public fun bootstrap(_cap: &AdminCap, ctx: &mut TxContext) {
    let market = MarketplaceV2 {
        id: object::new(ctx),
        prices: table::new(ctx),
        sellers: table::new(ctx),
    };
    transfer::share_object(market);
}

public fun list_pack_v2(
    config: &Config,
    market: &mut MarketplaceV2,
    mut pack: MemoryPack,
    price_mist: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    admin::assert_not_paused(config);
    assert!(price_mist > 0, constants::err_price_too_low());
    let seller = tx_context::sender(ctx);
    let pack_id = memory_nft::id(&pack);
    memory_nft::set_listed(&mut pack, true);
    dof::add(&mut market.id, pack_id, pack);
    table::add(&mut market.prices, pack_id, price_mist);
    table::add(&mut market.sellers, pack_id, seller);
    events::emit_pack_listed_v2(
        pack_id,
        seller,
        price_mist,
        clock::timestamp_ms(clock),
    );
}

public fun update_price(
    config: &Config,
    market: &mut MarketplaceV2,
    pack_id: ID,
    new_price_mist: u64,
    ctx: &TxContext,
) {
    admin::assert_not_paused(config);
    assert!(table::contains(&market.prices, pack_id), constants::err_not_listed());
    assert!(new_price_mist > 0, constants::err_price_too_low());
    let seller = *table::borrow(&market.sellers, pack_id);
    assert!(seller == tx_context::sender(ctx), constants::err_not_seller());
    let old_price = *table::borrow(&market.prices, pack_id);
    table::remove(&mut market.prices, pack_id);
    table::add(&mut market.prices, pack_id, new_price_mist);
    events::emit_pack_price_updated(pack_id, old_price, new_price_mist);
}

public fun cancel_listing_v2(
    config: &Config,
    market: &mut MarketplaceV2,
    pack_id: ID,
    ctx: &mut TxContext,
) {
    admin::assert_not_paused(config);
    assert!(table::contains(&market.prices, pack_id), constants::err_not_listed());
    let seller = *table::borrow(&market.sellers, pack_id);
    assert!(seller == tx_context::sender(ctx), constants::err_not_seller());
    table::remove(&mut market.prices, pack_id);
    table::remove(&mut market.sellers, pack_id);
    let mut pack: MemoryPack = dof::remove(&mut market.id, pack_id);
    memory_nft::set_listed(&mut pack, false);
    events::emit_pack_unlisted(pack_id, seller);
    memory_nft::share_to_sender(pack, ctx);
}

public fun buy_pack_v2(
    config: &Config,
    market: &mut MarketplaceV2,
    pack_id: ID,
    payment: &mut Coin<WAL>,
    ctx: &mut TxContext,
): MemoryPack {
    admin::assert_not_paused(config);
    assert!(table::contains(&market.prices, pack_id), constants::err_not_listed());
    let price = *table::borrow(&market.prices, pack_id);
    let seller = *table::borrow(&market.sellers, pack_id);
    assert!(coin::value(payment) >= price, constants::err_price_too_low());

    let mut pack: MemoryPack = dof::remove(&mut market.id, pack_id);
    let lineage = memory_ext::read_lineage(&pack);
    let creator = memory_nft::creator(&pack);
    let royalty_bps = memory_nft::royalty_bps(&pack);
    let buyer = tx_context::sender(ctx);

    let (fee_mist, royalty_mist, lineage_mist) = royalty::split_fee_and_royalties(
        payment,
        price,
        pack_id,
        creator,
        seller,
        royalty_bps,
        lineage,
        config,
        ctx,
    );

    table::remove(&mut market.prices, pack_id);
    table::remove(&mut market.sellers, pack_id);
    memory_nft::set_listed(&mut pack, false);
    events::emit_pack_sold_v2(
        pack_id,
        buyer,
        seller,
        price,
        fee_mist,
        royalty_mist,
        lineage_mist,
    );
    pack
}
