/// Fee + royalty math (basis points). Caps enforced at mint time on NFT (memory_nft).
module memwalpp_contracts::royalty;

const MARKETPLACE_FEE_BPS: u64 = 250; // 2.5%
const BPS_DENOM: u64 = 10000;

public fun marketplace_fee_bps(): u64 {
    MARKETPLACE_FEE_BPS
}

public fun take_fee(amount: u64): u64 {
    amount * MARKETPLACE_FEE_BPS / BPS_DENOM
}

public fun take_royalty(amount: u64, royalty_bps: u16): u64 {
    (amount as u128 * (royalty_bps as u128) / (BPS_DENOM as u128)) as u64
}
