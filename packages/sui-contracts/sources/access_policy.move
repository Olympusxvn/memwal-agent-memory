/// Seal access gate (ADR): authorize decryption path when caller matches pack delegate.
/// Production: compose with Mysten Seal package IDs via PTB; this module emits audit events.
module memwalpp_contracts::access_policy;

use memwalpp_contracts::memory_nft::{Self, MemoryPack};
use sui::event;
use sui::object::ID;
use sui::tx_context::{Self, TxContext};

public struct SealAccessGranted has copy, drop {
    pack_id: ID,
    walrus_blob_id: ID,
    caller: address,
}

const ENotAuthorized: u64 = 1;

/// Gate for Seal-style flows: only current `memwal_delegate` may signal approval for a blob.
public fun seal_approve_for_blob(pack: &MemoryPack, walrus_blob_id: ID, ctx: &TxContext) {
    assert!(
        tx_context::sender(ctx) == memory_nft::memwal_delegate(pack),
        ENotAuthorized,
    );
    event::emit(SealAccessGranted {
        pack_id: memory_nft::id(pack),
        walrus_blob_id,
        caller: tx_context::sender(ctx),
    });
}
