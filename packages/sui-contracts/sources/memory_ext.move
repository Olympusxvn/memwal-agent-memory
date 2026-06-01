/// Dynamic-field extension for MemoryPack: version, lineage, content_hash (v2).
module memwalpp_contracts::memory_ext;

use std::option::{Self, Option};
use memwalpp_contracts::constants::{Self, ExtKey};
use memwalpp_contracts::events;
use memwalpp_contracts::memory_nft::{Self, MemoryPack};
use sui::clock::{Self, Clock};
use sui::dynamic_field as df;
use sui::object::ID;
use sui::tx_context::TxContext;

public struct Lineage has store, copy, drop {
    parent: Option<ID>,
    root: Option<ID>,
    fork_depth: u16,
    ancestors: vector<address>,
}

public struct PackExt has store, copy, drop {
    version: u32,
    content_hash: vector<u8>,
    lineage: Lineage,
    updated_at_ms: u64,
}

public fun default_lineage(): Lineage {
    Lineage {
        parent: option::none(),
        root: option::none(),
        fork_depth: 0,
        ancestors: vector[],
    }
}

public fun has_ext(pack: &MemoryPack): bool {
    df::exists_<ExtKey>(memory_nft::uid(pack), constants::ext_key())
}

public fun get_version(pack: &MemoryPack): u32 {
    if (!has_ext(pack)) {
        return 1
    };
    let ext = df::borrow<ExtKey, PackExt>(memory_nft::uid(pack), constants::ext_key());
    ext.version
}

public fun read_lineage(pack: &MemoryPack): Lineage {
    if (!has_ext(pack)) {
        return default_lineage()
    };
    df::borrow<ExtKey, PackExt>(memory_nft::uid(pack), constants::ext_key()).lineage
}

public fun attach_ext(
    pack: &mut MemoryPack,
    content_hash: vector<u8>,
    clock: &Clock,
    _ctx: &TxContext,
) {
    let uid = memory_nft::uid_mut(pack);
    assert!(!df::exists_<ExtKey>(uid, constants::ext_key()), constants::err_ext_exists());
    let ts = clock::timestamp_ms(clock);
    df::add(
        uid,
        constants::ext_key(),
        PackExt {
            version: 1,
            content_hash,
            lineage: default_lineage(),
            updated_at_ms: ts,
        },
    );
}

public fun bump_version(
    pack: &mut MemoryPack,
    new_content_hash: vector<u8>,
    clock: &Clock,
    ctx: &TxContext,
) {
    if (!has_ext(pack)) {
        attach_ext(pack, new_content_hash, clock, ctx);
        return
    };
    let pack_id = memory_nft::id(pack);
    let uid = memory_nft::uid_mut(pack);
    let ext = df::borrow_mut<ExtKey, PackExt>(uid, constants::ext_key());
    let old_version = ext.version;
    ext.version = old_version + 1;
    ext.content_hash = new_content_hash;
    ext.updated_at_ms = clock::timestamp_ms(clock);
    let new_version = ext.version;
    let hash = ext.content_hash;
    let ts = ext.updated_at_ms;
    events::emit_memory_versioned(pack_id, old_version, new_version, hash, ts);
}

public fun fork_pack(
    parent: &MemoryPack,
    new_blob_ids: vector<ID>,
    content_hash: vector<u8>,
    royalty_bps: u16,
    clock: &Clock,
    ctx: &mut TxContext,
): MemoryPack {
    let parent_lineage = read_lineage(parent);
    let parent_id = memory_nft::id(parent);
    let parent_depth = parent_lineage.fork_depth;
    let child_depth = parent_depth + 1;
    assert!(child_depth <= constants::max_fork_depth(), constants::err_fork_depth());

    let root_id = if (option::is_some(&parent_lineage.root)) {
        *option::borrow(&parent_lineage.root)
    } else {
        parent_id
    };

    let mut ancestors = parent_lineage.ancestors;
    vector::push_back(&mut ancestors, memory_nft::creator(parent));
    cap_ancestors(&mut ancestors, constants::max_fork_depth());

    let mut child = memory_nft::mint_pack(
        memory_nft::namespace_bytes(parent),
        new_blob_ids,
        memory_nft::pack_type(parent),
        memory_nft::poa_proofs(parent),
        memory_nft::performance_score(parent),
        royalty_bps,
        ctx,
    );

    let child_lineage = Lineage {
        parent: option::some(parent_id),
        root: option::some(root_id),
        fork_depth: child_depth,
        ancestors,
    };

    let uid = memory_nft::uid_mut(&mut child);
    let ts = clock::timestamp_ms(clock);
    df::add(
        uid,
        constants::ext_key(),
        PackExt {
            version: 1,
            content_hash,
            lineage: child_lineage,
            updated_at_ms: ts,
        },
    );

    events::emit_pack_forked(
        memory_nft::id(&child),
        parent_id,
        root_id,
        memory_nft::creator(&child),
        child_depth,
        content_hash,
    );
    child
}

fun cap_ancestors(ancestors: &mut vector<address>, max_len: u16) {
    while (vector::length(ancestors) > (max_len as u64)) {
        vector::remove(ancestors, 0);
    };
}

public fun lineage_ancestors(lineage: &Lineage): vector<address> {
    lineage.ancestors
}

public fun lineage_fork_depth(lineage: &Lineage): u16 {
    lineage.fork_depth
}
