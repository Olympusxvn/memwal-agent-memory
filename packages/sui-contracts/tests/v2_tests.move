#[test_only]
module memwalpp_contracts::v2_tests;

use memwalpp_contracts::admin::{Self, AdminCap, BootstrapRegistry, Config};
use memwalpp_contracts::bounty_v2::{Self, BountyV2};
use memwalpp_contracts::constants;
use memwalpp_contracts::marketplace_v2::{Self, MarketplaceV2};
use memwalpp_contracts::memory_ext::{Self};
use memwalpp_contracts::memory_nft::{Self, MemoryPack};
use memwalpp_contracts::wal::{Self, WAL};
use std::option;
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::object::{Self, ID, UID};
use sui::test_scenario::{Self as ts};
use sui::transfer;
use sui::tx_context::TxContext;

public struct PackIdHolder has key {
    id: UID,
    pack_id: ID,
}

public struct BlobMarker has key {
    id: UID,
}

fun share_pack_id(pack_id: ID, ctx: &mut TxContext) {
    transfer::share_object(PackIdHolder {
        id: object::new(ctx),
        pack_id,
    });
}

fun blob_id(ctx: &mut TxContext): ID {
    let m = BlobMarker { id: object::new(ctx) };
    let id = object::id(&m);
    transfer::share_object(m);
    id
}

fun mint_wal(amount: u64, ctx: &mut TxContext): Coin<WAL> {
    coin::mint_for_testing<WAL>(amount, ctx)
}

fun setup_clock(s: &mut ts::Scenario) {
    ts::next_tx(s, @0xA);
    {
        let clk = clock::create_for_testing(ts::ctx(s));
        clock::share_for_testing(clk);
    };
}

fun setup_admin(s: &mut ts::Scenario): AdminCap {
    ts::next_tx(s, @0xA);
    {
        admin::init_for_test(ts::ctx(s));
    };
    ts::next_tx(s, @0xA);
    {
        let mut registry = ts::take_shared<BootstrapRegistry>(s);
        let cap = admin::bootstrap(&mut registry, ts::ctx(s));
        ts::return_shared(registry);
        transfer::public_transfer(cap, @0xA);
    };
    ts::next_tx(s, @0xA);
    {
        ts::take_from_sender<AdminCap>(s)
    }
}

fun setup_marketplace(s: &mut ts::Scenario, cap: &AdminCap) {
    ts::next_tx(s, @0xA);
    {
        marketplace_v2::bootstrap(cap, ts::ctx(s));
    };
}

#[test]
fun get_version_defaults_without_ext() {
    let mut s = ts::begin(@0xA);
    {
        let pack = memory_nft::mint_pack(b"ns", vector[], 1, vector[], 80, 100, ts::ctx(&mut s));
        assert!(!memory_ext::has_ext(&pack), 0);
        assert!(memory_ext::get_version(&pack) == 1, 1);
        transfer::public_transfer(pack, @0xA);
    };
    ts::end(s);
}

#[test]
fun attach_ext_and_bump_version() {
    let mut s = ts::begin(@0xA);
    setup_clock(&mut s);
    ts::next_tx(&mut s, @0xA);
    {
        let pack = memory_nft::mint_pack(b"ns", vector[], 1, vector[], 80, 100, ts::ctx(&mut s));
        transfer::public_transfer(pack, @0xA);
    };
    ts::next_tx(&mut s, @0xA);
    {
        let mut pack = ts::take_from_sender<MemoryPack>(&s);
        let clock = ts::take_shared<Clock>(&s);
        let ctx = ts::ctx(&mut s);
        memory_ext::attach_ext(&mut pack, b"hash-v1", &clock, ctx);
        assert!(memory_ext::has_ext(&pack), 0);
        assert!(memory_ext::get_version(&pack) == 1, 1);
        memory_ext::bump_version(&mut pack, b"hash-v2", &clock, ctx);
        assert!(memory_ext::get_version(&pack) == 2, 2);
        ts::return_shared(clock);
        ts::return_to_sender(&s, pack);
    };
    ts::end(s);
}

#[test]
fun fork_pack_sets_lineage() {
    let mut s = ts::begin(@0xA);
    setup_clock(&mut s);
    ts::next_tx(&mut s, @0xA);
    {
        let pack = memory_nft::mint_pack(b"ns", vector[], 1, vector[], 80, 100, ts::ctx(&mut s));
        transfer::public_transfer(pack, @0xA);
    };
    ts::next_tx(&mut s, @0xA);
    {
        let mut parent = ts::take_from_sender<MemoryPack>(&s);
        let clock = ts::take_shared<Clock>(&s);
        let ctx = ts::ctx(&mut s);
        memory_ext::attach_ext(&mut parent, b"parent-hash", &clock, ctx);
        let child = memory_ext::fork_pack(
            &parent,
            vector[blob_id(ctx)],
            b"child-hash",
            100,
            &clock,
            ctx,
        );
        let lineage = memory_ext::read_lineage(&child);
        assert!(memory_ext::lineage_fork_depth(&lineage) == 1, 0);
        assert!(vector::length(&memory_ext::lineage_ancestors(&lineage)) == 1, 1);
        ts::return_shared(clock);
        ts::return_to_sender(&s, parent);
        transfer::public_transfer(child, @0xA);
    };
    ts::end(s);
}

#[test]
#[expected_failure(abort_code = 105)]
fun fork_depth_exceeds_max() {
    let mut s = ts::begin(@0xA);
    setup_clock(&mut s);
    ts::next_tx(&mut s, @0xA);
    {
        let pack = memory_nft::mint_pack(b"ns", vector[], 1, vector[], 80, 100, ts::ctx(&mut s));
        transfer::public_transfer(pack, @0xA);
    };
    ts::next_tx(&mut s, @0xA);
    {
        let mut deepest = ts::take_from_sender<MemoryPack>(&s);
        let clock = ts::take_shared<Clock>(&s);
        let ctx = ts::ctx(&mut s);
        memory_ext::attach_ext(&mut deepest, b"root", &clock, ctx);
        let max = constants::max_fork_depth();
        let mut i = 0u16;
        while (i < max) {
            let next = memory_ext::fork_pack(
                &deepest,
                vector[blob_id(ctx)],
                b"h",
                100,
                &clock,
                ctx,
            );
            transfer::public_transfer(deepest, @0xA);
            deepest = next;
            i = i + 1;
        };
        let _too_deep = memory_ext::fork_pack(
            &deepest,
            vector[blob_id(ctx)],
            b"too-deep",
            100,
            &clock,
            ctx,
        );
        transfer::public_transfer(deepest, @0xA);
        transfer::public_transfer(_too_deep, @0xA);
        ts::return_shared(clock);
    };
    ts::end(s);
}

#[test]
#[expected_failure(abort_code = 100)]
fun admin_pause_aborts_bounty_post() {
    let mut s = ts::begin(@0xA);
    setup_clock(&mut s);
    let cap = setup_admin(&mut s);
    ts::next_tx(&mut s, @0xA);
    {
        let mut config = ts::take_shared<Config>(&s);
        admin::set_paused(&cap, &mut config, true);
        ts::return_shared(config);
        transfer::public_transfer(cap, @0xA);
    };
    ts::next_tx(&mut s, @0xA);
    {
        let config = ts::take_shared<Config>(&s);
        let clock = ts::take_shared<Clock>(&s);
        let payment = mint_wal(1000000000, ts::ctx(&mut s));
        bounty_v2::post_bounty_v2(
            &config,
            payment,
            clock::timestamp_ms(&clock) + 86400000,
            b"desc",
            50,
            &clock,
            ts::ctx(&mut s),
        );
        ts::return_shared(config);
        ts::return_shared(clock);
    };
    ts::end(s);
}

#[test]
fun bounty_v2_multi_submit_and_fulfill() {
    let mut s = ts::begin(@0xA);
    setup_clock(&mut s);
    let cap = setup_admin(&mut s);
    transfer::public_transfer(cap, @0xA);
    ts::next_tx(&mut s, @0xA);
    {
        let config = ts::take_shared<Config>(&s);
        let clock = ts::take_shared<Clock>(&s);
        let payment = mint_wal(5000000000, ts::ctx(&mut s));
        bounty_v2::post_bounty_v2(
            &config,
            payment,
            clock::timestamp_ms(&clock) + 86400000,
            b"bounty-hash",
            70,
            &clock,
            ts::ctx(&mut s),
        );
        ts::return_shared(config);
        ts::return_shared(clock);
    };
    ts::next_tx(&mut s, @0x1);
    {
        let config = ts::take_shared<Config>(&s);
        let clock = ts::take_shared<Clock>(&s);
        let mut bounty = ts::take_shared<BountyV2>(&s);
        bounty_v2::submit_fulfillment_v2(
            &config,
            &mut bounty,
            blob_id(ts::ctx(&mut s)),
            option::none(),
            &clock,
            ts::ctx(&mut s),
        );
        ts::return_shared(bounty);
        ts::return_shared(config);
        ts::return_shared(clock);
    };
    ts::next_tx(&mut s, @0x2);
    {
        let config = ts::take_shared<Config>(&s);
        let clock = ts::take_shared<Clock>(&s);
        let mut bounty = ts::take_shared<BountyV2>(&s);
        bounty_v2::submit_fulfillment_v2(
            &config,
            &mut bounty,
            blob_id(ts::ctx(&mut s)),
            option::none(),
            &clock,
            ts::ctx(&mut s),
        );
        assert!(bounty_v2::submission_count(&bounty) == 2, 0);
        ts::return_shared(bounty);
        ts::return_shared(config);
        ts::return_shared(clock);
    };
    ts::next_tx(&mut s, @0xA);
    {
        let mut bounty = ts::take_shared<BountyV2>(&s);
        let sub_id = bounty_v2::submission_id_at(&bounty, 1);
        bounty_v2::review_submission(&mut bounty, sub_id, true, ts::ctx(&mut s));
        assert!(option::is_some(&bounty_v2::accepted_submission(&bounty)), 1);
        ts::return_shared(bounty);
    };
    ts::next_tx(&mut s, @0xA);
    {
        let mut bounty = ts::take_shared<BountyV2>(&s);
        bounty_v2::fulfill_bounty_v2(&mut bounty, ts::ctx(&mut s));
        assert!(bounty_v2::is_completed(&bounty), 2);
        ts::return_shared(bounty);
    };
    ts::next_tx(&mut s, @0x2);
    {
        let paid = ts::take_from_sender<Coin<WAL>>(&s);
        transfer::public_transfer(paid, @0xA);
    };
    ts::end(s);
}

#[test]
fun buy_pack_v2_empty_lineage() {
    let mut s = ts::begin(@0xA);
    setup_clock(&mut s);
    let cap = setup_admin(&mut s);
    setup_marketplace(&mut s, &cap);
    transfer::public_transfer(cap, @0xA);
    ts::next_tx(&mut s, @0x51);
    {
        let pack = memory_nft::mint_pack(b"shop", vector[], 1, vector[], 90, 200, ts::ctx(&mut s));
        transfer::public_transfer(pack, @0x51);
    };
    ts::next_tx(&mut s, @0x51);
    {
        let config = ts::take_shared<Config>(&s);
        let clock = ts::take_shared<Clock>(&s);
        let mut market = ts::take_shared<MarketplaceV2>(&s);
        let pack = ts::take_from_sender<MemoryPack>(&s);
        let pack_id = memory_nft::id(&pack);
        let ctx = ts::ctx(&mut s);
        marketplace_v2::list_pack_v2(
            &config,
            &mut market,
            pack,
            10000000000,
            &clock,
            ctx,
        );
        share_pack_id(pack_id, ctx);
        ts::return_shared(market);
        ts::return_shared(config);
        ts::return_shared(clock);
    };
    ts::next_tx(&mut s, @0x52);
    {
        let config = ts::take_shared<Config>(&s);
        let mut market = ts::take_shared<MarketplaceV2>(&s);
        let holder = ts::take_shared<PackIdHolder>(&s);
        let pack_id = holder.pack_id;
        let mut payment = mint_wal(20000000000, ts::ctx(&mut s));
        let pack = marketplace_v2::buy_pack_v2(
            &config,
            &mut market,
            pack_id,
            &mut payment,
            ts::ctx(&mut s),
        );
        let PackIdHolder { id, pack_id: _ } = holder;
        object::delete(id);
        ts::return_shared(market);
        ts::return_shared(config);
        transfer::public_transfer(pack, @0x52);
        transfer::public_transfer(payment, @0x52);
    };
    ts::next_tx(&mut s, @0x52);
    {
        let pack = ts::take_from_sender<MemoryPack>(&s);
        assert!(memory_nft::creator(&pack) == @0x51, 0);
        ts::return_to_sender(&s, pack);
    };
    ts::end(s);
}
