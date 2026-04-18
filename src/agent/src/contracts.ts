/**
 * Contract ABIs and type definitions for ConfluxMind on-chain interaction.
 *
 * StrategyController is the core contract. It manages strategy addresses,
 * weights (in basis points, summing to 10000), and APYs.
 */

export const STRATEGY_CONTROLLER_ABI = [
  // --- Read functions ---
  {
    name: "getStrategies",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "addrs", type: "address[]" }],
  },
  {
    name: "getWeights",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "currentWeights", type: "uint256[]" }],
  },
  {
    name: "getStrategyAPYs",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "apys", type: "uint256[]" }],
  },
  {
    name: "totalStrategyAssets",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "totalAssets", type: "uint256" }],
  },
  {
    name: "lastRebalanceTime",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "timestamp", type: "uint256" }],
  },
  // --- Write functions ---
  {
    name: "rebalance",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "newWeights", type: "uint256[]" }],
    outputs: [],
  },
] as const;

/**
 * Labels for known testnet strategy addresses.
 * Used to produce human-readable reasoning logs.
 */
export const STRATEGY_LABELS: Record<string, string> = {
  // These will be filled with actual deployed strategy addresses.
  // Fallback labeling uses the index.
};

/**
 * Inferred strategy type based on label keywords.
 */
export function inferStrategyType(
  label: string
): "lending" | "staking" | "lp" | "unknown" {
  const lower = label.toLowerCase();
  if (lower.includes("lend") || lower.includes("unitus") || lower.includes("dforce"))
    return "lending";
  if (lower.includes("stak") || lower.includes("shui"))
    return "staking";
  if (lower.includes("lp") || lower.includes("swap") || lower.includes("wallfreex"))
    return "lp";
  return "unknown";
}

export interface OnChainStrategyData {
  address: string;
  label: string;
  type: "lending" | "staking" | "lp" | "unknown";
  currentWeightBps: bigint;
  apyBps: bigint;
}
