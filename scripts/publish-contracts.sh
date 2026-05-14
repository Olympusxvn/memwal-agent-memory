#!/usr/bin/env bash
set -euo pipefail

# Deploy memwalpp_contracts. Requires: sui CLI, active address with SUI for gas.
# Usage:
#   SUI_NETWORK=testnet GAS_BUDGET=300000000 ./scripts/publish-contracts.sh
# Do NOT put private keys in this script.

NETWORK="${SUI_NETWORK:-testnet}"
GAS="${GAS_BUDGET:-300000000}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/packages/sui-contracts"

echo "==> sui move build"
sui move build

echo "==> sui client publish (network=$NETWORK gas=$GAS)"
echo "    Active address should match your deployer wallet."
sui client publish --gas-budget "$GAS" --network "$NETWORK"
