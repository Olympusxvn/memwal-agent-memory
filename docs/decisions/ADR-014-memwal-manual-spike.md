# ADR-014: MemWalManual spike (doc-only)

**Status:** Proposed (spike — not implemented)  
**Date:** 2026-06-13  
**Context:** Walrus Track Gap F · Phase 16

## Decision

Document **MemWalManual** as the privacy-maximum trust path for Walrus Memory, but **do not wire** it in the hackathon demo. Default remains managed relayer after local `redactForUpstream`.

## Rationale

- Managed relayer is the fastest judge path (`MEMWAL_*` + `pnpm agent:bounty-hunt`).
- MemWalManual requires relayer-side changes and key management not in scope for Overflow deadline.
- Trust table in SUBMISSION + Doc Hub satisfies “privacy story” without blocking demos.

## Consequences

- SUBMISSION §3.2 and Doc Hub `#trust` cite this ADR.
- Future work: evaluate MemWalManual when upstream docs stabilize (see `walrus-memory-alignment.md` P2).

## References

- [`docs/walrus-memory-alignment.md`](../walrus-memory-alignment.md)
- [`SUBMISSION.md`](../SUBMISSION.md) §3.2
