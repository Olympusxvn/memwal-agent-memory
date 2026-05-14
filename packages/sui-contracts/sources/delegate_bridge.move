/// Atomic PTB companion: rotate MemWal delegate on `MemoryPack` after ownership transfer.
/// MemWal package calls composed in TypeScript PTB alongside buy_pack (masterplan).
module memwalpp_contracts::delegate_bridge;

use memwalpp_contracts::memory_nft::{Self, MemoryPack};
use sui::event;
use sui::object::ID;
use sui::tx_context::{Self, TxContext};

public struct DelegateRotated has copy, drop {
    pack_id: ID,
    new_delegate: address,
    rotated_by: address,
}

/// Sets `memwal_delegate` on pack (same package as memory_nft). Caller must own `MemoryPack`.
public fun rotate_memwal_delegate(pack: &mut MemoryPack, new_delegate: address, ctx: &TxContext) {
    memory_nft::set_memwal_delegate(pack, new_delegate);
    event::emit(DelegateRotated {
        pack_id: memory_nft::id(pack),
        new_delegate,
        rotated_by: tx_context::sender(ctx),
    });
}
