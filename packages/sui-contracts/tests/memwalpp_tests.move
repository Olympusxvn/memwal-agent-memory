#[test_only]
module memwalpp_contracts::memwalpp_tests;

use memwalpp_contracts::delegate_bridge;
use memwalpp_contracts::memory_nft::{Self, MemoryPack};
use sui::transfer;
use sui::test_scenario::{Self as ts};

#[test]
fun mint_and_rotate_delegate() {
    let mut s = ts::begin(@0xA);
    {
        let ctx = ts::ctx(&mut s);
        let blobs = vector[];
        let pack = memory_nft::mint_pack(b"demo-ns", blobs, 1, vector[], 80, 100, ctx);
        transfer::public_transfer(pack, @0xA);
    };
    ts::next_tx(&mut s, @0xA);
    {
        let mut p = ts::take_from_sender<MemoryPack>(&s);
        delegate_bridge::rotate_memwal_delegate(&mut p, @0xB, ts::ctx(&mut s));
        ts::return_to_sender(&s, p);
    };
    ts::next_tx(&mut s, @0xA);
    {
        let p = ts::take_from_sender<MemoryPack>(&s);
        assert!(memory_nft::memwal_delegate(&p) == @0xB, 0);
        ts::return_to_sender(&s, p);
    };
    ts::end(s);
}
