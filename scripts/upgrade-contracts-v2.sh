#!/usr/bin/env bash
set -euo pipefail

# Upgrade memwalpp_contracts in-place (package id unchanged).
# Requires: sui CLI, active address that owns UpgradeCap, SUI for gas.
#
# Usage:
#   SUI_NETWORK=mainnet GAS_BUDGET=500000000 ./scripts/upgrade-contracts-v2.sh
# Then bootstrap v2 shared objects:
#   pnpm contracts:bootstrap-v2 --discover
#   SUI_OPERATOR_PRIVATE_KEY=... pnpm contracts:bootstrap-v2

UPGRADE_CAP="${UPGRADE_CAP_ID:-0xada975edf109c28a8b74f3789312b90acef29aa7fa28a5e936dc489055e0fd66}"
GAS="${GAS_BUDGET:-500000000}"
NETWORK="${SUI_NETWORK:-mainnet}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT/packages/sui-contracts"

echo "==> sui move build"
sui move build

echo ""
echo "==> sui client upgrade (network=$NETWORK gas=$GAS)"
echo "    UpgradeCap: $UPGRADE_CAP"
echo "    Active address must own the UpgradeCap."
sui client upgrade --upgrade-capability "$UPGRADE_CAP" --gas-budget "$GAS"

echo ""
echo "==> Upgrade submitted. Verify Published.toml version bumped."
echo "    Next: pnpm contracts:bootstrap-v2 --discover"
echo "          SUI_OPERATOR_PRIVATE_KEY=... pnpm contracts:bootstrap-v2"
