/**
 * Minimal ABIs and address management for ConfluxMind contracts.
 */

/**
 * Minimal ABI for the StrategyController contract.
 *
 * Functions:
 * - getStrategies(): returns (address[] strategyAddresses, string[] strategyTypes)
 * - getWeights(): returns (uint256[] currentWeights)  -- weights in bps, sum to 10000
 * - getStrategyAPYs(): returns (uint256[] apys)       -- APYs in bps (e.g., 500 = 5.00%)
 * - rebalance(uint256[] newWeights): sets new allocation weights
 * - totalStrategyAssets(): returns (uint256 totalAssets)
 */
export const STRATEGY_CONTROLLER_ABI = [
  // Read functions
  {
    name: "getStrategies",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "addrs", type: "address[]" },
    ],
  },
  {
    name: "getWeights",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "currentWeights", type: "uint256[]" },
    ],
  },
  {
    name: "getStrategyAPYs",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "apys", type: "uint256[]" },
    ],
  },
  {
    name: "totalStrategyAssets",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "totalAssets", type: "uint256" },
    ],
  },
  // Write functions
  {
    name: "rebalance",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "newWeights", type: "uint256[]" },
    ],
    outputs: [],
  },
] as const;

/**
 * Strategy information returned from on-chain reads.
 */
export interface StrategyInfo {
  address: string;
  type: string;
  currentWeight: bigint;
  apyBps: bigint;
}
