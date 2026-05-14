/// MemoryPack NFT — PoA metadata stored off-chain; on-chain holds refs + delegate slot.
module memwalpp_contracts::memory_nft;

use std::string::{Self, String};
use sui::event;
use sui::object::{Self, ID, UID};
use sui::transfer;
use sui::tx_context::{Self, TxContext};

/// Single-namespace MemoryPack (ADR-006).
public struct MemoryPack has key, store {
    id: UID,
    /// Namespace label (single namespace per pack).
    namespace: String,
    /// Walrus blob object IDs (serialized ids).
    blob_ids: vector<ID>,
    pack_type: u8,
    creator: address,
    poa_proofs: vector<vector<u8>>,
    performance_score: u8,
    is_listed: bool,
    royalty_bps: u16,
    /// MemWal delegate rotated on sale via delegate_bridge (ADR-011 narrative).
    memwal_delegate: address,
}

public struct PackMinted has copy, drop {
    pack_id: ID,
    creator: address,
    namespace: String,
}

/// Mint a new pack owned by sender.
public fun mint_pack(
    namespace: vector<u8>,
    blob_ids: vector<ID>,
    pack_type: u8,
    poa_proofs: vector<vector<u8>>,
    performance_score: u8,
    royalty_bps: u16,
    ctx: &mut TxContext,
): MemoryPack {
    assert!(royalty_bps <= 1000, ERoyaltyTooHigh);
    let sender = tx_context::sender(ctx);
    let namespace_str = string::utf8(namespace);
    let id = object::new(ctx);
    let pack = MemoryPack {
        id,
        namespace: namespace_str,
        blob_ids,
        pack_type,
        creator: sender,
        poa_proofs,
        performance_score,
        is_listed: false,
        royalty_bps,
        memwal_delegate: sender,
    };
    let pack_id = object::id(&pack);
    event::emit(PackMinted {
        pack_id,
        creator: sender,
        namespace: pack.namespace,
    });
    pack
}

public fun burn_pack(pack: MemoryPack) {
    let MemoryPack { id, .. } = pack;
    object::delete(id);
}

public fun id(pack: &MemoryPack): ID {
    object::id(pack)
}

public fun creator(pack: &MemoryPack): address {
    pack.creator
}

public fun royalty_bps(pack: &MemoryPack): u16 {
    pack.royalty_bps
}

public fun set_listed(pack: &mut MemoryPack, listed: bool) {
    pack.is_listed = listed;
}

public fun memwal_delegate(pack: &MemoryPack): address {
    pack.memwal_delegate
}

public(package) fun set_memwal_delegate(pack: &mut MemoryPack, new_delegate: address) {
    pack.memwal_delegate = new_delegate;
}

public fun share_to_sender(pack: MemoryPack, ctx: &mut TxContext) {
    transfer::public_transfer(pack, tx_context::sender(ctx));
}

const ERoyaltyTooHigh: u64 = 1;
