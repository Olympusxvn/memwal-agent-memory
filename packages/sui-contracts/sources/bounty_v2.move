/// Multi-submission bounty v2 with review + fulfill flow (ADR-008).
module memwalpp_contracts::bounty_v2;

use std::option::{Self, Option};
use memwalpp_contracts::admin::{Self, Config};
use memwalpp_contracts::constants;
use memwalpp_contracts::events;
use memwalpp_contracts::wal::WAL;
use sui::balance::{Self, Balance};
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::object::{Self, ID, UID};
use sui::transfer;
use sui::tx_context::{Self, TxContext};

public struct Submission has store, copy, drop {
    submission_id: ID,
    claimer: address,
    walrus_blob_id: ID,
    pack_id: Option<ID>,
    submitted_at_ms: u64,
}

public struct BountyV2 has key {
    id: UID,
    poster: address,
    wal_escrow: Balance<WAL>,
    deadline_ms: u64,
    description_hash: vector<u8>,
    min_score: u8,
    submissions: vector<Submission>,
    accepted: Option<ID>,
    completed: bool,
}

public fun post_bounty_v2(
    config: &Config,
    payment: Coin<WAL>,
    deadline_ms: u64,
    description_hash: vector<u8>,
    min_score: u8,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    admin::assert_not_paused(config);
    let now = clock::timestamp_ms(clock);
    assert!(deadline_ms > now, constants::err_bounty_deadline());
    let amount = coin::value(&payment);
    assert!(amount > 0, constants::err_bounty_zero());
    let poster = tx_context::sender(ctx);
    let wal_escrow = coin::into_balance(payment);
    let bounty = BountyV2 {
        id: object::new(ctx),
        poster,
        wal_escrow,
        deadline_ms,
        description_hash,
        min_score,
        submissions: vector[],
        accepted: option::none(),
        completed: false,
    };
    let bounty_id = object::id(&bounty);
    events::emit_bounty_posted_v2(
        bounty_id,
        poster,
        amount,
        deadline_ms,
        description_hash,
        min_score,
    );
    transfer::share_object(bounty);
}

public struct SubmissionMarker has key {
    id: UID,
}

public fun submit_fulfillment_v2(
    config: &Config,
    bounty: &mut BountyV2,
    walrus_blob_id: ID,
    pack_id: Option<ID>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    admin::assert_not_paused(config);
    assert!(!bounty.completed, constants::err_bounty_completed());
    assert!(clock::timestamp_ms(clock) <= bounty.deadline_ms, constants::err_bounty_deadline());
    let claimer = tx_context::sender(ctx);
    let marker = SubmissionMarker { id: object::new(ctx) };
    let submission_id = object::id(&marker);
    let SubmissionMarker { id } = marker;
    object::delete(id);
    let sub = Submission {
        submission_id,
        claimer,
        walrus_blob_id,
        pack_id,
        submitted_at_ms: clock::timestamp_ms(clock),
    };
    vector::push_back(&mut bounty.submissions, sub);
    events::emit_fulfillment_submitted_v2(
        object::id(bounty),
        submission_id,
        claimer,
        walrus_blob_id,
    );
}

public fun review_submission(
    bounty: &mut BountyV2,
    submission_id: ID,
    accept: bool,
    ctx: &TxContext,
) {
    assert!(!bounty.completed, constants::err_bounty_completed());
    assert!(tx_context::sender(ctx) == bounty.poster, constants::err_not_poster());
    assert!(option::is_some(&find_submission_index(bounty, submission_id)), constants::err_submission_not_found());
    if (accept) {
        bounty.accepted = option::some(submission_id);
    } else if (option::is_some(&bounty.accepted)) {
        let current = *option::borrow(&bounty.accepted);
        if (current == submission_id) {
            bounty.accepted = option::none();
        };
    };
    events::emit_fulfillment_reviewed(object::id(bounty), submission_id, accept);
}

public fun fulfill_bounty_v2(bounty: &mut BountyV2, ctx: &mut TxContext) {
    assert!(!bounty.completed, constants::err_bounty_completed());
    assert!(tx_context::sender(ctx) == bounty.poster, constants::err_not_poster());
    assert!(option::is_some(&bounty.accepted), constants::err_no_accepted());
    let accepted_id = *option::borrow(&bounty.accepted);
    let claimer = find_claimer(bounty, accepted_id);
    let amount = balance::value(&bounty.wal_escrow);
    let bal = balance::split(&mut bounty.wal_escrow, amount);
    let paid = coin::from_balance(bal, ctx);
    transfer::public_transfer(paid, claimer);
    let dust = balance::withdraw_all(&mut bounty.wal_escrow);
    balance::destroy_zero(dust);
    bounty.completed = true;
    events::emit_bounty_paid_v2(object::id(bounty), claimer, amount);
}

public fun cancel_and_refund_v2(
    bounty: &mut BountyV2,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(!bounty.completed, constants::err_bounty_completed());
    assert!(tx_context::sender(ctx) == bounty.poster, constants::err_not_poster());
    assert!(clock::timestamp_ms(clock) > bounty.deadline_ms, constants::err_bounty_still_active());
    assert!(option::is_none(&bounty.accepted), constants::err_no_accepted());
    let amount = balance::value(&bounty.wal_escrow);
    let bal = balance::split(&mut bounty.wal_escrow, amount);
    let refund = coin::from_balance(bal, ctx);
    let poster = bounty.poster;
    transfer::public_transfer(refund, poster);
    let dust = balance::withdraw_all(&mut bounty.wal_escrow);
    balance::destroy_zero(dust);
    bounty.completed = true;
    events::emit_bounty_cancelled_v2(object::id(bounty), poster, amount);
}

fun find_submission_index(bounty: &BountyV2, submission_id: ID): Option<u64> {
    let len = vector::length(&bounty.submissions);
    let mut i = 0u64;
    while (i < len) {
        let sub = vector::borrow(&bounty.submissions, i);
        if (sub.submission_id == submission_id) {
            return option::some(i)
        };
        i = i + 1;
    };
    option::none()
}

fun find_claimer(bounty: &BountyV2, submission_id: ID): address {
    let idx = find_submission_index(bounty, submission_id);
    assert!(option::is_some(&idx), constants::err_submission_not_found());
    let i = *option::borrow(&idx);
    let sub = vector::borrow(&bounty.submissions, i);
    sub.claimer
}

public fun submission_count(bounty: &BountyV2): u64 {
    vector::length(&bounty.submissions)
}

public fun is_completed(bounty: &BountyV2): bool {
    bounty.completed
}

public fun accepted_submission(bounty: &BountyV2): Option<ID> {
    bounty.accepted
}

#[test_only]
public fun submission_id_at(bounty: &BountyV2, index: u64): ID {
    vector::borrow(&bounty.submissions, index).submission_id
}
