-- Memory Kiosk / marketplace indexer (ADR-009). Map Sui events → Postgres.
-- Event payloads match Move structs in memwalpp_contracts package.

CREATE TABLE IF NOT EXISTS marketplace_pack_listings (
    pack_id TEXT PRIMARY KEY,
    seller TEXT NOT NULL,
    price_mist BIGINT NOT NULL,
    tx_digest TEXT NOT NULL,
    checkpoint BIGINT,
    timestamp_ms BIGINT,
    raw_json JSONB
);

CREATE TABLE IF NOT EXISTS marketplace_pack_sales (
    pack_id TEXT PRIMARY KEY,
    buyer TEXT NOT NULL,
    seller TEXT NOT NULL,
    price_mist BIGINT NOT NULL,
    marketplace_fee_mist BIGINT NOT NULL,
    royalty_mist BIGINT NOT NULL,
    tx_digest TEXT NOT NULL,
    checkpoint BIGINT,
    timestamp_ms BIGINT
);

CREATE TABLE IF NOT EXISTS bounty_posts (
    bounty_id TEXT PRIMARY KEY,
    poster TEXT NOT NULL,
    amount_mist BIGINT NOT NULL,
    deadline_ms BIGINT NOT NULL,
    description_hash BYTEA NOT NULL,
    tx_digest TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS bounty_fulfillments (
    bounty_id TEXT PRIMARY KEY,
    claimer TEXT NOT NULL,
    walrus_blob_id TEXT NOT NULL,
    tx_digest TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bounty_payouts (
    bounty_id TEXT PRIMARY KEY,
    claimer TEXT NOT NULL,
    amount_mist BIGINT NOT NULL,
    tx_digest TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_listings_seller ON marketplace_pack_listings (seller);
CREATE INDEX IF NOT EXISTS idx_sales_buyer ON marketplace_pack_sales (buyer);
