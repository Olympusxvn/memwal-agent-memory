# On-chain outcome mapping (ADR-005)

Local hooks compute candidate metrics; **displayed** scores in UI must match aggregated **Sui events** emitted after measurable outcomes.

| Hook stage | Responsibility |
|------------|----------------|
| `afterModelCall` | Prepare `OnChainOutcomeEvent` payload; TS SDK batches PTB step calling Move `event::emit` pattern or MemWal delegate pipeline. |
| Indexer | Consumes Move + MemWal events into Postgres; dashboard reads only indexed rows. |

Do not show a “quality score” sourced only from SQLite/local-memory without a matching chain event digest.

---

## Package notes — `@memwalpp/memwal-client`

- **OpenSpec / API contract:** [`docs/specs/openspec-memwal-client.md`](../../docs/specs/openspec-memwal-client.md)
- **Usage (env, factories):** see [`README.md`](./README.md) in this package.
