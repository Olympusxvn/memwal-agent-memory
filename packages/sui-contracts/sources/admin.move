/// AdminCap + shared Config for tunable v2 policy (fee, pause).
module memwalpp_contracts::admin;

use memwalpp_contracts::constants;
use memwalpp_contracts::events;
use sui::object::{Self, UID};
use sui::transfer;
use sui::tx_context::{Self, TxContext};

public struct AdminCap has key, store {
    id: UID,
}

public struct Config has key {
    id: UID,
    marketplace_fee_bps: u16,
    max_royalty_bps: u16,
    paused: bool,
    version: u16,
}

/// One-shot bootstrap guard (created in init on first publish / module add on upgrade).
public struct BootstrapRegistry has key {
    id: UID,
    done: bool,
}

fun init(ctx: &mut TxContext) {
    transfer::share_object(BootstrapRegistry {
        id: object::new(ctx),
        done: false,
    });
}

public fun bootstrap(
    registry: &mut BootstrapRegistry,
    ctx: &mut TxContext,
): AdminCap {
    assert!(!registry.done, constants::err_already_bootstrapped());
    registry.done = true;
    let cap = AdminCap { id: object::new(ctx) };
    let config = Config {
        id: object::new(ctx),
        marketplace_fee_bps: constants::default_marketplace_fee_bps(),
        max_royalty_bps: constants::default_max_royalty_bps(),
        paused: false,
        version: 1,
    };
    transfer::share_object(config);
    cap
}

public fun assert_not_paused(config: &Config) {
    assert!(!config.paused, constants::err_paused());
}

public fun marketplace_fee_bps(config: &Config): u16 {
    config.marketplace_fee_bps
}

public fun max_royalty_bps(config: &Config): u16 {
    config.max_royalty_bps
}

public fun is_paused(config: &Config): bool {
    config.paused
}

public fun set_fee_bps(
    _cap: &AdminCap,
    config: &mut Config,
    new_fee_bps: u16,
) {
    let old = config.marketplace_fee_bps as u64;
    config.marketplace_fee_bps = new_fee_bps;
    events::emit_config_updated(b"marketplace_fee_bps", old, new_fee_bps as u64);
}

public fun set_max_royalty_bps(
    _cap: &AdminCap,
    config: &mut Config,
    new_max: u16,
) {
    let old = config.max_royalty_bps as u64;
    config.max_royalty_bps = new_max;
    events::emit_config_updated(b"max_royalty_bps", old, new_max as u64);
}

public fun set_paused(_cap: &AdminCap, config: &mut Config, paused: bool) {
    let old = if (config.paused) { 1 } else { 0 };
    config.paused = paused;
    let new_val = if (paused) { 1 } else { 0 };
    events::emit_config_updated(b"paused", old, new_val);
}

#[test_only]
public fun init_for_test(ctx: &mut TxContext) {
    init(ctx);
}
