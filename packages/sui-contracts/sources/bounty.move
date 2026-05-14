/// WAL bounties with escrow (ADR-008). Shared-object `Bounty` per listing.
module memwalpp_contracts::bounty;

use std::option::{Self, Option};
use memwalpp_contracts::wal::WAL;
use sui::balance::{Self, Balance};
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::event;
use sui::object::{Self, ID, UID};
use sui::transfer;
use sui::tx_context::{Self, TxContext};

public struct Bounty has key {
    id: UID,
    poster: address,
    wal_escrow: Balance<WAL>,
    deadline_ms: u64,
    description_hash: vector<u8>,
    fulfillment_blob_id: Option<ID>,
    claimer: Option<address>,
    completed: bool,
}

public struct BountyPosted has copy, drop {
    bounty_id: ID,
    poster: address,
    amount_mist: u64,
    deadline_ms: u64,
    description_hash: vector<u8>,
}

public struct FulfillmentSubmitted has copy, drop {
    bounty_id: ID,
    claimer: address,
    walrus_blob_id: ID,
}

public struct BountyPaid has copy, drop {
    bounty_id: ID,
    claimer: address,
    amount_mist: u64,
}

public struct BountyCancelled has copy, drop {
    bounty_id: ID,
    poster: address,
    refund_mist: u64,
}

const EDeadlinePast: u64 = 1;
const EZeroAmount: u64 = 2;
const ENotPoster: u64 = 3;
const ENeedFulfillment: u64 = 4;
const EAlreadySubmitted: u64 = 5;
const ECompleted: u64 = 6;
const EStillActive: u64 = 7;

public fun post_bounty(
    payment: Coin<WAL>,
    deadline_ms: u64,
    description_hash: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let now = clock::timestamp_ms(clock);
    assert!(deadline_ms > now, EDeadlinePast);
    let amount = coin::value(&payment);
    assert!(amount > 0, EZeroAmount);
    let poster = tx_context::sender(ctx);
    let wal_escrow = coin::into_balance(payment);
    let bounty = Bounty {
        id: object::new(ctx),
        poster,
        wal_escrow,
        deadline_ms,
        description_hash,
        fulfillment_blob_id: option::none(),
        claimer: option::none(),
        completed: false,
    };
    let bounty_id = object::id(&bounty);
    event::emit(BountyPosted {
        bounty_id,
        poster,
        amount_mist: amount,
        deadline_ms,
        description_hash,
    });
    transfer::share_object(bounty);
}

public fun submit_fulfillment(
    bounty: &mut Bounty,
    walrus_blob_id: ID,
    clock: &Clock,
    ctx: &TxContext,
) {
    assert!(!bounty.completed, ECompleted);
    assert!(clock::timestamp_ms(clock) <= bounty.deadline_ms, EDeadlinePast);
    assert!(option::is_none(&bounty.fulfillment_blob_id), EAlreadySubmitted);
    let claimer = tx_context::sender(ctx);
    bounty.fulfillment_blob_id = option::some(walrus_blob_id);
    bounty.claimer = option::some(claimer);
    event::emit(FulfillmentSubmitted {
        bounty_id: object::id(bounty),
        claimer,
        walrus_blob_id,
    });
}

public fun approve_fulfillment(bounty: &mut Bounty, ctx: &mut TxContext) {
    assert!(!bounty.completed, ECompleted);
    assert!(tx_context::sender(ctx) == bounty.poster, ENotPoster);
    assert!(option::is_some(&bounty.claimer), ENeedFulfillment);
    let claimer = *option::borrow(&bounty.claimer);
    let amount = balance::value(&bounty.wal_escrow);
    let bal = balance::split(&mut bounty.wal_escrow, amount);
    let paid = coin::from_balance(bal, ctx);
    transfer::public_transfer(paid, claimer);
    let dust = balance::withdraw_all(&mut bounty.wal_escrow);
    balance::destroy_zero(dust);
    bounty.completed = true;
    event::emit(BountyPaid {
        bounty_id: object::id(bounty),
        claimer,
        amount_mist: amount,
    });
}

public fun cancel_and_refund(bounty: &mut Bounty, clock: &Clock, ctx: &mut TxContext) {
    assert!(!bounty.completed, ECompleted);
    assert!(tx_context::sender(ctx) == bounty.poster, ENotPoster);
    assert!(clock::timestamp_ms(clock) > bounty.deadline_ms, EStillActive);
    assert!(option::is_none(&bounty.fulfillment_blob_id), ENeedFulfillment);
    let amount = balance::value(&bounty.wal_escrow);
    let bal = balance::split(&mut bounty.wal_escrow, amount);
    let refund = coin::from_balance(bal, ctx);
    let poster = bounty.poster;
    transfer::public_transfer(refund, poster);
    let dust = balance::withdraw_all(&mut bounty.wal_escrow);
    balance::destroy_zero(dust);
    bounty.completed = true;
    event::emit(BountyCancelled {
        bounty_id: object::id(bounty),
        poster,
        refund_mist: amount,
    });
}
