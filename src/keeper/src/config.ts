import * as dotenv from "dotenv";
import { LogLevel } from "./logger";

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export interface StrategyRiskConfig {
  /** Strategy type identifier (e.g., "lending", "lp", "staking") */
  type: string;
  /** Risk weight between 0 and 1. Higher = more favorable. */
  riskWeight: number;
  /** Minimum allocation in basis points (0-10000) */
  minAllocationBps: number;
  /** Maximum allocation in basis points (0-10000) */
  maxAllocationBps: number;
}

export interface KeeperConfig {
  /** Conflux eSpace RPC URL */
  rpcUrl: string;
  /** Chain ID for Conflux eSpace */
  chainId: number;
  /** Private key for signing transactions (without 0x prefix is fine) */
  privateKey: string;
  /** StrategyController contract address */
  strategyControllerAddress: string;
  /** Polling interval in milliseconds */
  pollIntervalMs: number;
  /** Minimum yield delta in basis points to trigger rebalance */
  rebalanceThresholdBps: number;
  /** Maximum gas price in gwei; skip rebalance if gas exceeds this */
  maxGasPriceGwei: number;
  /** Per-strategy-type risk configuration */
  strategyRiskConfigs: StrategyRiskConfig[];
  /** Log level */
  logLevel: LogLevel;
  /** Whether to run in dry-run mode (log but don't submit transactions) */
  dryRun: boolean;
}

/**
 * Parse STRATEGY_RISK_CONFIGS from env.
 * Format: "type:riskWeight:minBps:maxBps,type:riskWeight:minBps:maxBps"
 * Example: "lending:0.9:500:5000,lp:0.6:0:3000,staking:0.8:500:4000"
 */
function parseStrategyRiskConfigs(raw: string): StrategyRiskConfig[] {
  if (!raw) {
    return [
      { type: "lending", riskWeight: 0.9, minAllocationBps: 500, maxAllocationBps: 5000 },
      { type: "lp", riskWeight: 0.6, minAllocationBps: 0, maxAllocationBps: 3000 },
      { type: "staking", riskWeight: 0.8, minAllocationBps: 500, maxAllocationBps: 4000 },
    ];
  }

  return raw.split(",").map((entry) => {
    const parts = entry.trim().split(":");
    if (parts.length !== 4) {
      throw new Error(`Invalid STRATEGY_RISK_CONFIGS entry: "${entry}". Expected format: type:riskWeight:minBps:maxBps`);
    }
    const [type, riskWeightStr, minBpsStr, maxBpsStr] = parts;
    const riskWeight = parseFloat(riskWeightStr);
    const minAllocationBps = parseInt(minBpsStr, 10);
    const maxAllocationBps = parseInt(maxBpsStr, 10);

    if (isNaN(riskWeight) || riskWeight < 0 || riskWeight > 1) {
      throw new Error(`Invalid risk weight for "${type}": ${riskWeightStr}. Must be between 0 and 1.`);
    }
    if (isNaN(minAllocationBps) || minAllocationBps < 0 || minAllocationBps > 10000) {
      throw new Error(`Invalid min allocation for "${type}": ${minBpsStr}. Must be between 0 and 10000.`);
    }
    if (isNaN(maxAllocationBps) || maxAllocationBps < 0 || maxAllocationBps > 10000) {
      throw new Error(`Invalid max allocation for "${type}": ${maxBpsStr}. Must be between 0 and 10000.`);
    }
    if (minAllocationBps > maxAllocationBps) {
      throw new Error(`Min allocation (${minAllocationBps}) exceeds max (${maxAllocationBps}) for "${type}".`);
    }

    return { type, riskWeight, minAllocationBps, maxAllocationBps };
  });
}

export function loadConfig(): KeeperConfig {
  const privateKey = requireEnv("KEEPER_PRIVATE_KEY");
  const strategyControllerAddress = requireEnv("STRATEGY_CONTROLLER_ADDRESS");

  const rpcUrl = optionalEnv("RPC_URL", "https://evmtestnet.confluxrpc.com");
  const chainId = parseInt(optionalEnv("CHAIN_ID", "71"), 10);
  const pollIntervalMs = parseInt(optionalEnv("POLL_INTERVAL_MS", "300000"), 10);
  const rebalanceThresholdBps = parseInt(optionalEnv("REBALANCE_THRESHOLD_BPS", "50"), 10);
  const maxGasPriceGwei = parseInt(optionalEnv("MAX_GAS_PRICE_GWEI", "100"), 10);
  const logLevel = (optionalEnv("LOG_LEVEL", "INFO") as LogLevel) || LogLevel.INFO;
  const dryRun = optionalEnv("DRY_RUN", "false").toLowerCase() === "true";
  const strategyRiskConfigs = parseStrategyRiskConfigs(optionalEnv("STRATEGY_RISK_CONFIGS", ""));

  if (isNaN(chainId)) throw new Error("CHAIN_ID must be a valid number");
  if (isNaN(pollIntervalMs) || pollIntervalMs < 10000) throw new Error("POLL_INTERVAL_MS must be >= 10000");
  if (isNaN(rebalanceThresholdBps)) throw new Error("REBALANCE_THRESHOLD_BPS must be a valid number");
  if (isNaN(maxGasPriceGwei)) throw new Error("MAX_GAS_PRICE_GWEI must be a valid number");

  return {
    rpcUrl,
    chainId,
    privateKey,
    strategyControllerAddress,
    pollIntervalMs,
    rebalanceThresholdBps,
    maxGasPriceGwei,
    strategyRiskConfigs,
    logLevel,
    dryRun,
  };
}
