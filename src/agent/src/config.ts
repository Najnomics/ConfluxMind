/**
 * ConfluxMind AI Agent Configuration
 *
 * All values are loaded from environment variables with sensible defaults
 * for Conflux eSpace testnet.
 */

import * as dotenv from "dotenv";

// Load .env from project root (two levels up from src/agent/src)
dotenv.config({ path: "../../.env" });
dotenv.config(); // also try local .env

export interface AgentConfig {
  /** Conflux eSpace RPC endpoint */
  rpcUrl: string;
  /** Chain ID (71 = Conflux eSpace testnet) */
  chainId: number;
  /** Private key for signing rebalance transactions */
  privateKey: string;
  /** StrategyController contract address */
  strategyControllerAddress: string;
  /** Vault contract address */
  vaultAddress: string;
  /** Polling interval in milliseconds (default: 5 minutes) */
  pollIntervalMs: number;
  /** Minimum weight delta in basis points to trigger rebalance */
  rebalanceThresholdBps: number;
  /** If true, log decisions but do not submit transactions */
  dryRun: boolean;
}

function env(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val;
}

export function loadConfig(): AgentConfig {
  const privateKey =
    process.env["KEEPER_PRIVATE_KEY"] ||
    process.env["PRIVATE_KEY"] ||
    "";

  return {
    rpcUrl: env("RPC_URL", env("CONFLUX_ESPACE_TESTNET_RPC", "https://evmtestnet.confluxrpc.com")),
    chainId: parseInt(env("CHAIN_ID", "71"), 10),
    privateKey,
    strategyControllerAddress: env(
      "STRATEGY_CONTROLLER_ADDRESS",
      "0x766d707FA8deD8F23C3bF65e547d19aA5F154188"
    ),
    vaultAddress: env(
      "VAULT_ADDRESS",
      "0x76Cbe8f11FdaC8edE2a49E297163508af9A17cF2"
    ),
    pollIntervalMs: parseInt(env("POLL_INTERVAL_MS", "300000"), 10),
    rebalanceThresholdBps: parseInt(env("REBALANCE_THRESHOLD_BPS", "50"), 10),
    dryRun: env("DRY_RUN", "true").toLowerCase() === "true",
  };
}
