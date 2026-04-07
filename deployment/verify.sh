#!/bin/bash
set -euo pipefail

# ConfluxMind - Contract Verification Script for ConfluxScan
# Usage: ./deployment/verify.sh
#
# Verifies all deployed contracts on ConfluxScan (eSpace).
# Requires deployed contract addresses to be set in .env.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    source "$PROJECT_ROOT/.env"
else
    echo "Error: .env file not found at $PROJECT_ROOT/.env"
    exit 1
fi

# Determine RPC URL and explorer URL based on chain
CHAIN_ID="${CHAIN_ID:-71}"
if [ "$CHAIN_ID" = "71" ]; then
    RPC_URL="${CONFLUX_ESPACE_TESTNET_RPC:-https://evmtestnet.confluxrpc.com}"
    EXPLORER_URL="https://evmtestnet.confluxscan.io"
    echo "Network: Conflux eSpace Testnet"
elif [ "$CHAIN_ID" = "1030" ]; then
    RPC_URL="${CONFLUX_ESPACE_RPC:-https://evm.confluxrpc.com}"
    EXPLORER_URL="https://evm.confluxscan.io"
    echo "Network: Conflux eSpace Mainnet"
else
    echo "Error: Unsupported CHAIN_ID=$CHAIN_ID (expected 71 for testnet or 1030 for mainnet)"
    exit 1
fi

# Validate required addresses
for VAR in VAULT_ADDRESS STRATEGY_CONTROLLER_ADDRESS GAS_SPONSOR_MANAGER_ADDRESS; do
    VAL="${!VAR:-}"
    if [ -z "$VAL" ] || [ "$VAL" = "0x..." ]; then
        echo "Error: $VAR not set in .env (currently: ${VAL:-unset})"
        exit 1
    fi
done

echo "Explorer: $EXPLORER_URL"
echo ""

# Helper function for verification
verify_contract() {
    local name="$1"
    local address="$2"
    local contract_path="$3"
    local constructor_args="${4:-}"

    echo "--- Verifying $name at $address ---"

    local cmd="forge verify-contract"
    cmd+=" --rpc-url $RPC_URL"
    cmd+=" --verifier blockscout"
    cmd+=" --verifier-url ${EXPLORER_URL}/api"
    cmd+=" $address"
    cmd+=" $contract_path"

    if [ -n "$constructor_args" ]; then
        cmd+=" --constructor-args $constructor_args"
    fi

    echo "Running: $cmd"
    eval "$cmd" && echo "Verified: $name" || echo "FAILED: $name (may already be verified)"
    echo ""
}

# ── Verify Core Contracts ───────────────────────────────────────────────

# StrategyController(address _asset, address _keeper)
CONTROLLER_ARGS=$(cast abi-encode "constructor(address,address)" "$USDT0_ADDRESS" "$KEEPER_ADDRESS")
verify_contract \
    "StrategyController" \
    "$STRATEGY_CONTROLLER_ADDRESS" \
    "contracts/core/StrategyController.sol:StrategyController" \
    "$CONTROLLER_ARGS"

# ConfluxMindVault(IERC20 _asset, string _name, string _symbol, address _controller, address _feeRecipient)
DEPLOYER_ADDRESS=$(cast wallet address "$PRIVATE_KEY" 2>/dev/null || echo "")
if [ -z "$DEPLOYER_ADDRESS" ]; then
    echo "Warning: Could not derive deployer address from PRIVATE_KEY. Skipping vault verification."
else
    VAULT_ARGS=$(cast abi-encode "constructor(address,string,string,address,address)" \
        "$USDT0_ADDRESS" \
        "ConfluxMind Yield Token" \
        "cmUSDT" \
        "$STRATEGY_CONTROLLER_ADDRESS" \
        "$DEPLOYER_ADDRESS")
    verify_contract \
        "ConfluxMindVault" \
        "$VAULT_ADDRESS" \
        "contracts/core/ConfluxMindVault.sol:ConfluxMindVault" \
        "$VAULT_ARGS"
fi

# GasSponsorManager() - no constructor args
verify_contract \
    "GasSponsorManager" \
    "$GAS_SPONSOR_MANAGER_ADDRESS" \
    "contracts/core/GasSponsorManager.sol:GasSponsorManager"

# ── Verify Strategy Adapters (if addresses are provided) ────────────────

if [ -n "${DFORCE_ADAPTER_ADDRESS:-}" ] && [ "$DFORCE_ADAPTER_ADDRESS" != "0x..." ]; then
    DFORCE_ARGS=$(cast abi-encode "constructor(address,address,address)" \
        "$USDT0_ADDRESS" "$STRATEGY_CONTROLLER_ADDRESS" "$DFORCE_UNITUS_ITOKEN")
    verify_contract \
        "DForceUnitusAdapter" \
        "$DFORCE_ADAPTER_ADDRESS" \
        "contracts/strategies/DForceUnitusAdapter.sol:DForceUnitusAdapter" \
        "$DFORCE_ARGS"
fi

if [ -n "${SHUI_ADAPTER_ADDRESS:-}" ] && [ "$SHUI_ADAPTER_ADDRESS" != "0x..." ]; then
    SHUI_ARGS=$(cast abi-encode "constructor(address,address,address,address)" \
        "$WCFX_ADDRESS" "$STRATEGY_CONTROLLER_ADDRESS" "$SHUI_FINANCE_STAKING" "$SHUI_FINANCE_SFX")
    verify_contract \
        "SHUIFinanceAdapter" \
        "$SHUI_ADAPTER_ADDRESS" \
        "contracts/strategies/SHUIFinanceAdapter.sol:SHUIFinanceAdapter" \
        "$SHUI_ARGS"
fi

if [ -n "${WALLFREEX_ADAPTER_ADDRESS:-}" ] && [ "$WALLFREEX_ADAPTER_ADDRESS" != "0x..." ]; then
    WFX_ARGS=$(cast abi-encode "constructor(address,address,address,address,address)" \
        "$USDT0_ADDRESS" "$STRATEGY_CONTROLLER_ADDRESS" "$WALLFREEX_ROUTER" "$WALLFREEX_LP_PAIR" "$AXCNH_ADDRESS")
    verify_contract \
        "WallFreeXAdapter" \
        "$WALLFREEX_ADAPTER_ADDRESS" \
        "contracts/strategies/WallFreeXAdapter.sol:WallFreeXAdapter" \
        "$WFX_ARGS"
fi

echo "=== Verification Complete ==="
echo "Check results at: $EXPLORER_URL"
