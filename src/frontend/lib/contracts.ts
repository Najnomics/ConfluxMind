import { type Address } from "viem";

// ---------------------------------------------------------------------------
// Contract addresses — Conflux eSpace Testnet (Chain ID: 71)
// ---------------------------------------------------------------------------

export const ADDRESSES = {
  vault: "0x76Cbe8f11FdaC8edE2a49E297163508af9A17cF2" as Address,
  strategyController: "0x766d707FA8deD8F23C3bF65e547d19aA5F154188" as Address,
  gasSponsorManager: "0x0105543D716AbE2dc96c41d6AEA913a3A0603eFA" as Address,
  usdt0: "0x1Fb61DC9751c3c0259E2E70E1af5968012953667" as Address,
  dForceStrategy: "0x6926165994325ABC6e551af84EdCBab98Af4eFe3" as Address,
  shuiStrategy: "0xF94A8F5CfA9E0FD1D0920419b936181eC1790be8" as Address,
  wallFreeXStrategy: "0xF0A7dbCCBcB3F315103cf7e6368A5b0CdBCf0e10" as Address,
} as const;

// ---------------------------------------------------------------------------
// Supported assets
// ---------------------------------------------------------------------------

export const SUPPORTED_ASSETS = [
  { symbol: "USDT0", name: "Mock USDT", decimals: 6, address: ADDRESSES.usdt0 },
] as const;

// ---------------------------------------------------------------------------
// ERC-4626 Vault ABI (minimal interface)
// ---------------------------------------------------------------------------

export const VAULT_ABI = [
  {
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    name: "deposit",
    outputs: [{ name: "shares", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "owner", type: "address" },
    ],
    name: "withdraw",
    outputs: [{ name: "shares", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "shares", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "owner", type: "address" },
    ],
    name: "redeem",
    outputs: [{ name: "assets", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "totalAssets",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "assets", type: "uint256" }],
    name: "previewDeposit",
    outputs: [{ name: "shares", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "shares", type: "uint256" }],
    name: "previewRedeem",
    outputs: [{ name: "assets", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "asset",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ---------------------------------------------------------------------------
// StrategyController ABI (minimal)
// ---------------------------------------------------------------------------

export const STRATEGY_CONTROLLER_ABI = [
  {
    inputs: [],
    name: "getStrategies",
    outputs: [{ name: "addrs", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getWeights",
    outputs: [{ name: "weights", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getStrategyAPYs",
    outputs: [{ name: "apys", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalStrategyAssets",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastRebalanceTime",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "strategyCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ---------------------------------------------------------------------------
// ERC-20 ABI (minimal)
// ---------------------------------------------------------------------------

export const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ---------------------------------------------------------------------------
// Strategy names (for display)
// ---------------------------------------------------------------------------

export const STRATEGY_NAMES = [
  "dForce Unitus Lending",
  "SHUI Finance Staking",
  "WallFreeX Stablecoin LP",
] as const;
