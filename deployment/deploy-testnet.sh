#!/bin/bash
set -euo pipefail

# ConfluxMind - Testnet Deployment Script
# Usage: ./deployment/deploy-testnet.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    source "$PROJECT_ROOT/.env"
else
    echo "Error: .env file not found at $PROJECT_ROOT/.env"
    echo "Copy .env.example to .env and fill in your values."
    exit 1
fi

# Validate required env vars
if [ -z "${PRIVATE_KEY:-}" ] || [ "$PRIVATE_KEY" = "your_private_key_here" ]; then
    echo "Error: PRIVATE_KEY not set in .env"
    exit 1
fi

if [ -z "${CONFLUX_ESPACE_TESTNET_RPC:-}" ]; then
    echo "Error: CONFLUX_ESPACE_TESTNET_RPC not set in .env"
    exit 1
fi

echo "=== ConfluxMind Testnet Deployment ==="
echo "RPC: $CONFLUX_ESPACE_TESTNET_RPC"
echo ""

forge script deployment/DeployTestnet.s.sol \
    --rpc-url "$CONFLUX_ESPACE_TESTNET_RPC" \
    --broadcast \
    --verify \
    -vvvv

echo ""
echo "Deployment complete. Update .env with the deployed addresses above."
