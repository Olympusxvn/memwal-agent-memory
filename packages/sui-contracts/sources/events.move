/// Centralized v2 events + emit helpers (indexer-friendly).
module memwalpp_contracts::events;

use sui::event;
use sui::object::ID;

public struct PackForked has copy, drop {
    pack_id: ID,
    parent_id: ID,
    root_id: ID,
    creator: address,
    fork_depth: u16,
    content_hash: vector<u8>,
}

public struct MemoryVersioned has copy, drop {
    pack_id: ID,
    old_version: u32,
    new_version: u32,
    content_hash: vector<u8>,
    ts_ms: u64,
}

public struct PackPriceUpdated has copy, drop {
    pack_id: ID,
    old_price_mist: u64,
    new_price_mist: u64,
}

public struct PackUnlisted has copy, drop {
    pack_id: ID,
    seller: address,
}

public struct PackListedV2 has copy, drop {
    pack_id: ID,
    seller: address,
    price_mist: u64,
    ts_ms: u64,
}

public struct PackSoldV2 has copy, drop {
    pack_id: ID,
    buyer: address,
    seller: address,
    price_mist: u64,
    fee_mist: u64,
    royalty_mist: u64,
    lineage_mist: u64,
}

public struct LineageRoyaltyPaid has copy, drop {
    pack_id: ID,
    recipient: address,
    amount_mist: u64,
    depth: u16,
}

public struct FulfillmentReviewed has copy, drop {
    bounty_id: ID,
    submission_id: ID,
    accepted: bool,
}

public struct BountyPostedV2 has copy, drop {
    bounty_id: ID,
    poster: address,
    amount_mist: u64,
    deadline_ms: u64,
    description_hash: vector<u8>,
    min_score: u8,
}

public struct FulfillmentSubmittedV2 has copy, drop {
    bounty_id: ID,
    submission_id: ID,
    claimer: address,
    walrus_blob_id: ID,
}

public struct BountyPaidV2 has copy, drop {
    bounty_id: ID,
    claimer: address,
    amount_mist: u64,
}

public struct BountyCancelledV2 has copy, drop {
    bounty_id: ID,
    poster: address,
    refund_mist: u64,
}

public struct ConfigUpdated has copy, drop {
    field: vector<u8>,
    old_value: u64,
    new_value: u64,
}

public(package) fun emit_pack_forked(
    pack_id: ID,
    parent_id: ID,
    root_id: ID,
    creator: address,
    fork_depth: u16,
    content_hash: vector<u8>,
) {
    event::emit(PackForked {
        pack_id,
        parent_id,
        root_id,
        creator,
        fork_depth,
        content_hash,
    });
}

public(package) fun emit_memory_versioned(
    pack_id: ID,
    old_version: u32,
    new_version: u32,
    content_hash: vector<u8>,
    ts_ms: u64,
) {
    event::emit(MemoryVersioned {
        pack_id,
        old_version,
        new_version,
        content_hash,
        ts_ms,
    });
}

public(package) fun emit_pack_price_updated(
    pack_id: ID,
    old_price_mist: u64,
    new_price_mist: u64,
) {
    event::emit(PackPriceUpdated { pack_id, old_price_mist, new_price_mist });
}

public(package) fun emit_pack_unlisted(pack_id: ID, seller: address) {
    event::emit(PackUnlisted { pack_id, seller });
}

public(package) fun emit_pack_listed_v2(
    pack_id: ID,
    seller: address,
    price_mist: u64,
    ts_ms: u64,
) {
    event::emit(PackListedV2 { pack_id, seller, price_mist, ts_ms });
}

public(package) fun emit_pack_sold_v2(
    pack_id: ID,
    buyer: address,
    seller: address,
    price_mist: u64,
    fee_mist: u64,
    royalty_mist: u64,
    lineage_mist: u64,
) {
    event::emit(PackSoldV2 {
        pack_id,
        buyer,
        seller,
        price_mist,
        fee_mist,
        royalty_mist,
        lineage_mist,
    });
}

public(package) fun emit_lineage_royalty_paid(
    pack_id: ID,
    recipient: address,
    amount_mist: u64,
    depth: u16,
) {
    event::emit(LineageRoyaltyPaid { pack_id, recipient, amount_mist, depth });
}

public(package) fun emit_fulfillment_reviewed(
    bounty_id: ID,
    submission_id: ID,
    accepted: bool,
) {
    event::emit(FulfillmentReviewed { bounty_id, submission_id, accepted });
}

public(package) fun emit_bounty_posted_v2(
    bounty_id: ID,
    poster: address,
    amount_mist: u64,
    deadline_ms: u64,
    description_hash: vector<u8>,
    min_score: u8,
) {
    event::emit(BountyPostedV2 {
        bounty_id,
        poster,
        amount_mist,
        deadline_ms,
        description_hash,
        min_score,
    });
}

public(package) fun emit_fulfillment_submitted_v2(
    bounty_id: ID,
    submission_id: ID,
    claimer: address,
    walrus_blob_id: ID,
) {
    event::emit(FulfillmentSubmittedV2 {
        bounty_id,
        submission_id,
        claimer,
        walrus_blob_id,
    });
}

public(package) fun emit_bounty_paid_v2(bounty_id: ID, claimer: address, amount_mist: u64) {
    event::emit(BountyPaidV2 { bounty_id, claimer, amount_mist });
}

public(package) fun emit_bounty_cancelled_v2(
    bounty_id: ID,
    poster: address,
    refund_mist: u64,
) {
    event::emit(BountyCancelledV2 { bounty_id, poster, refund_mist });
}

public(package) fun emit_config_updated(field: vector<u8>, old_value: u64, new_value: u64) {
    event::emit(ConfigUpdated { field, old_value, new_value });
}
