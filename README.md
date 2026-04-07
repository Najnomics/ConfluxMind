# ConfluxMind

> Autonomous DeFAI yield optimization — your capital, always working at peak efficiency.

---

## Overview

ConfluxMind is an autonomous, AI-powered yield aggregation protocol built on Conflux eSpace. Users deposit assets into a non-custodial ERC-4626 vault; an on-chain AI strategy agent continuously reads live yield signals across Conflux's DeFi ecosystem — dForce Unitus lending markets, SHUI Finance liquid staking, and WallFreeX liquidity pools — and autonomously rebalances allocations toward the highest risk-adjusted returns. All user interactions are gasless via Conflux's native Fee Sponsorship mechanism, enabling zero-friction onboarding for any wallet.

ConfluxMind is the first fully on-chain DeFAI (Decentralized Finance + AI) yield manager on Conflux — delivering the "DeFAI era" vision that dForce has articulated, in production.

---

## Hackathon

**Global Hackfest 2026** | 2026-03-23 – 2026-04-20

**Prize Targets:** Main Award ($1,500) + Best AI + Conflux Project ($500)

---

## Team

- **Nosakhare Jesuorobo** — Lead Smart Contract Developer (GitHub: [@najnomics](https://github.com/najnomics), Discord: najnomics)
- Team Member 2 (GitHub: @username, Discord: username)
- Team Member 3 (GitHub: @username, Discord: username)
- Team Member 4 (GitHub: @username, Discord: username)
- Team Member 5 (GitHub: @username, Discord: username)

---

## Problem Statement

DeFi yield on Conflux eSpace is fragmented across multiple protocols — dForce Unitus lending, SHUI Finance CFX staking, WallFreeX liquidity pools — each with independently fluctuating APYs. Today, a user who wants to maximize returns must:

1. Monitor rate changes across all protocols manually, in real time
2. Calculate and compare risk-adjusted yields themselves
3. Execute multiple transactions to rebalance — each costing gas
4. Repeat this process continuously as market conditions shift

This is operationally impossible for most users. Capital sits idle in suboptimal positions, leaking yield every hour. The result: Conflux's DeFi ecosystem has deep liquidity primitives but no intelligent layer to route capital efficiently between them.

For protocols like dForce, this means TVL that underperforms its potential. For users, it means systematic wealth erosion through inaction.

---

## Solution

ConfluxMind introduces a three-layer architecture:

**1. The Vault Layer** — An ERC-4626 compliant smart contract that accepts user deposits in supported assets (USDT0, AxCNH, CFX). Shares are minted representing proportional ownership of vault assets plus accrued yield. Withdrawals are available at any time, no lockups.

**2. The AI Strategy Layer** — A Solidity `StrategyController` contract maintains a weighted allocation across registered yield strategies. Strategy weights are updated by a permissioned off-chain AI agent (the "Keeper") that aggregates on-chain signals — current lending rates from dForce, SHUI staking APY, WallFreeX pool depths and fee tiers — and computes optimal allocations using a risk-adjusted yield model. The Keeper submits a signed `rebalance(weights[])` call on-chain; the StrategyController validates, then atomically rebalances.

**3. The Gasless UX Layer** — Conflux's Fee Sponsorship mechanism is used to sponsor all vault deposit, withdraw, and claim transactions. A `GasSponsorManager` contract auto-maintains the sponsor whitelist, funded from a portion of protocol fees. Users with zero CFX balance can still interact fully.

The result: deposit once, earn optimized yield perpetually, withdraw whenever.

---

## Go-to-Market Plan

### Target Users

- **Primary:** DeFi-native users on Conflux eSpace seeking passive yield without manual management overhead — estimated 15,000–25,000 active eSpace addresses as of Q1 2026.
- **Secondary:** Users bridging USDT0 or AxCNH to Conflux for the first time via KinetFlow, Meson, or Orbiter — ConfluxMind is their first stop.
- **Tertiary:** DAOs and protocol treasuries on Conflux seeking automated treasury yield management.

### Distribution

- **Phase 1 (Hackathon):** Deploy on Conflux eSpace testnet. Live demo with real Conflux testnet CFX. Submission to Global Hackfest 2026.
- **Phase 2 (Post-Hackathon, Month 1–2):** Mainnet launch with USDT0 and AxCNH as initial supported assets. Apply for Conflux Ecosystem Grants Program (fast-tracked for hackathon winners). Partnership outreach to dForce and SHUI Finance for co-marketing.
- **Phase 3 (Month 3–6):** Expand strategy integrations (Swappi, GinsengSwap). Introduce protocol fee switch (10% of yield → protocol treasury). Launch referral program with on-chain attribution. Target $500K TVL within 90 days of mainnet.

### Growth Mechanics

- **Gasless UX** removes the single biggest friction for new users — they never need to acquire CFX before using the protocol.
- **Auto-compounding** creates compounding retention — once deposited, users have no reason to leave.
- **Transparent AI signals** — publish rebalance reasoning publicly on-chain to build trust with DeFi-native audiences.

### Key Metrics

| Metric             | 30-Day Target | 90-Day Target |
| ------------------ | ------------- | ------------- |
| TVL                | $50K          | $500K         |
| Unique depositors  | 200           | 1,500         |
| Rebalance events   | 30            | 150           |
| Gas sponsored (USD) | $500         | $3,000        |

---

## Conflux Integration

ConfluxMind is built natively for Conflux eSpace and leverages multiple Conflux-specific capabilities:

- [ ] Core Space
- [x] **eSpace** — All smart contracts deployed on Conflux eSpace (EVM-compatible, low gas, high TPS)
- [ ] Cross-Space Bridge
- [x] **Gas Sponsorship** — `GasSponsorManager.sol` sponsors all user-facing transactions (deposit, withdraw, claimYield). Users with zero CFX can fully interact with the protocol.
- [x] **Built-in Contracts** — Uses Conflux's `SponsorWhitelistControl` built-in contract at `0x0888000000000000000000000000000000000001` for programmatic Fee Sponsorship management.
- [x] **Partner Integrations:**
  - **dForce Unitus** — Primary lending yield strategy. Deposits assets into Unitus lending markets; harvests interest continuously.
  - **SHUI Finance** — CFX liquid staking strategy. Converts CFX deposits to sFX for staking yield; sFX held in vault as a yield-bearing position.
  - **WallFreeX** — Stablecoin LP strategy. Provides AxCNH/USDT liquidity to WallFreeX pools; earns swap fees.
  - **Meson.fi** — Cross-chain entry: users bridge USDT0 or AxCNH from external chains directly into ConfluxMind deposits in one transaction.

---

## Features

- **Autonomous Yield Optimization** — On-chain AI Keeper continuously monitors and rebalances across dForce, SHUI Finance, and WallFreeX based on live yield signals
- **ERC-4626 Compliant Vault** — Standard share accounting; composable with any DeFi protocol that reads ERC-4626 vaults
- **Gasless User Experience** — Conflux's Fee Sponsorship mechanism eliminates all gas costs for end users; zero CFX required to deposit or withdraw
- **Multi-Asset Support** — Accepts USDT0, AxCNH, and CFX as deposit assets; auto-converts to strategy-optimal form
- **Real-Time Rebalancing** — Keeper triggers rebalance when yield delta between strategies exceeds a configurable threshold (default: 50bps)
- **Transparent Strategy Execution** — All rebalance events are logged on-chain with full allocation weights and yield rationale
- **Non-Custodial** — Users hold ERC-4626 shares; no admin key can access underlying assets
- **Emergency Withdrawal** — Circuit breaker allows immediate full withdrawal bypassing keeper logic if triggered

---

## Technology Stack

- **Frontend:** React 18, Next.js 14, Wagmi v2, Viem, TailwindCSS, Recharts (yield history charts)
- **Backend / Keeper:** Node.js 20, TypeScript, on-chain event listener via `ethers.js` v6, cron-based rebalance scheduler
- **Blockchain:** Conflux eSpace (Chain ID: 1030 mainnet / 71 testnet)
- **Smart Contracts:** Solidity ^0.8.24, Foundry (forge, cast, anvil)
- **Protocol Integrations:** dForce Unitus SDK, SHUI Finance sFX interface, WallFreeX router
- **Conflux-Specific:** `SponsorWhitelistControl` built-in contract, Conflux eSpace RPC (`evm.confluxrpc.com`)
- **Testing:** Forge test suite with 31 passing tests
- **DevOps:** GitHub Actions CI, Tenderly for contract monitoring and alerting

---

## Setup Instructions

### Prerequisites

- Node.js v20+
- Foundry (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- Git
- Conflux wallet (Fluent Wallet or MetaMask with Conflux eSpace network added)
- Testnet CFX from [Conflux faucet](https://faucet.confluxnetwork.org/)

### Installation

1. Clone the repository

   ```bash
   git clone https://github.com/najnomics/conflux-mind
   cd conflux-mind
   ```

2. Install Foundry dependencies

   ```bash
   forge install
   ```

3. Install frontend and keeper dependencies

   ```bash
   npm run install:all
   ```

4. Configure environment

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:

   ```env
   # Conflux eSpace
   CONFLUX_ESPACE_RPC=https://evm.confluxrpc.com
   CONFLUX_ESPACE_TESTNET_RPC=https://evmtestnet.confluxrpc.com
   CHAIN_ID=1030

   # Deployer
   PRIVATE_KEY=your_private_key_here

   # Protocol addresses (eSpace mainnet)
   DFORCE_UNITUS_COMPTROLLER=0x...
   SHUI_FINANCE_STAKING=0x...
   WALLFREEX_ROUTER=0x...
   USDT0_ADDRESS=0x...
   AXCNH_ADDRESS=0x...

   # Keeper
   KEEPER_REBALANCE_THRESHOLD_BPS=50
   KEEPER_POLL_INTERVAL_SECONDS=300

   # Sponsor
   SPONSOR_FUND_AMOUNT_CFX=1000
   ```

5. Compile contracts

   ```bash
   forge build
   ```

6. Run the application

   ```bash
   # Start frontend
   npm run dev

   # Start keeper (in separate terminal)
   npm run keeper
   ```

### Testing

```bash
# Run full test suite
forge test -vvv

# Run with Conflux eSpace mainnet fork
forge test --fork-url https://evm.confluxrpc.com -vvv

# Run specific test file
forge test --match-path test/ConfluxMindVault.t.sol -vvv

# Generate coverage report
forge coverage --report lcov
```

---

## Usage

### For Users

1. **Connect Wallet** — Open the ConfluxMind app and connect Fluent Wallet or MetaMask (configured for Conflux eSpace). No CFX needed — all gas is sponsored.

2. **Select Asset & Amount** — Choose your deposit asset (USDT0, AxCNH, or CFX) and enter an amount.

3. **Deposit** — Click "Deposit". The vault mints `cmTokens` (ERC-4626 shares) representing your proportional stake. Your tokens begin earning optimized yield immediately.

4. **Monitor** — The dashboard shows your current position value, APY, accumulated yield, and a real-time feed of the AI Keeper's rebalance decisions with reasoning.

5. **Withdraw** — Click "Withdraw" and specify share amount or percentage. Funds arrive in your wallet within the same transaction. No unlock period.

### For Developers (Keeper Integration)

The Keeper service polls on-chain state on a 5-minute interval:

```typescript
import { ConfluxMindKeeper } from '@conflux-mind/keeper';

const keeper = new ConfluxMindKeeper({
  vaultAddress: '0x...',
  rpcUrl: process.env.CONFLUX_ESPACE_RPC,
  privateKey: process.env.KEEPER_PRIVATE_KEY,
  rebalanceThresholdBps: 50,
});

await keeper.start(); // begins polling and auto-rebalancing
```

---

## Demo

- **Live Demo:** [https://frontend-three-chi-42.vercel.app](https://frontend-three-chi-42.vercel.app) *(testnet deployment)*
- **About Page:** [https://frontend-three-chi-42.vercel.app/about](https://frontend-three-chi-42.vercel.app/about)
- **Demo Video:** [YouTube — ConfluxMind walkthrough](https://youtube.com/watch?v=TBD)
- **Screenshots:** See `/demo/screenshots/` folder

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                            │
│           React + Next.js + Wagmi (Conflux eSpace)              │
└────────────────────────────┬────────────────────────────────────┘
                             │  deposit / withdraw (gasless via Fee Sponsorship)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   ConfluxMindVault.sol (ERC-4626)                │
│  ┌──────────────────┐    ┌──────────────────────────────────┐   │
│  │  Share Accounting│    │   GasSponsorManager.sol          │   │
│  │  (cmToken mint/  │    │   (SponsorWhitelistControl       │   │
│  │   burn + yield)  │    │    built-in at 0x0888...)        │   │
│  └──────────────────┘    └──────────────────────────────────┘   │
└──────────────┬─────────────────────────────────────────────────┘
               │  allocate / rebalance (keeper-signed)
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  StrategyController.sol                          │
│   Maintains weighted allocation across registered strategies     │
│   Validates Keeper signatures · Executes atomic rebalances       │
└──────┬──────────────────┬────────────────────────┬─────────────┘
       │                  │                          │
       ▼                  ▼                          ▼
┌─────────────┐  ┌─────────────────┐  ┌──────────────────────┐
│ dForce      │  │ SHUI Finance    │  │ WallFreeX            │
│ Adapter.sol │  │ Adapter.sol     │  │ Adapter.sol          │
│             │  │                 │  │                      │
│ Unitus      │  │ CFX → sFX stake │  │ AxCNH/USDT0 LP      │
│ lending     │  │ yield harvested │  │ fee yield harvested  │
└─────────────┘  └─────────────────┘  └──────────────────────┘

               ▲  yield signals (every 5 min)
               │
┌─────────────────────────────────────────────────────────────────┐
│                     Off-Chain AI Keeper                          │
│  Node.js · Reads on-chain rates · Computes optimal weights       │
│  Signs rebalance calldata · Submits to StrategyController        │
└─────────────────────────────────────────────────────────────────┘
```

**Key Design Decisions:**
- The Keeper is permissioned but non-custodial — it can only call `rebalance()`, never touch user funds directly.
- All strategy adapters implement a common `IStrategy` interface, making new protocol integrations a single adapter contract.
- ERC-4626 compliance ensures ConfluxMind vault shares are natively composable with any future Conflux DeFi protocol.

---

## Smart Contracts

### Testnet (Conflux eSpace Testnet — Chain ID: 71)

| Contract                     | Address                                                                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MockUSDT`                   | [`0x1Fb61DC9751c3c0259E2E70E1af5968012953667`](https://evmtestnet.confluxscan.org/address/0x1Fb61DC9751c3c0259E2E70E1af5968012953667)                 |
| `ConfluxMindVault`           | [`0x76Cbe8f11FdaC8edE2a49E297163508af9A17cF2`](https://evmtestnet.confluxscan.org/address/0x76Cbe8f11FdaC8edE2a49E297163508af9A17cF2)                 |
| `StrategyController`         | [`0x766d707FA8deD8F23C3bF65e547d19aA5F154188`](https://evmtestnet.confluxscan.org/address/0x766d707FA8deD8F23C3bF65e547d19aA5F154188)                 |
| `GasSponsorManager`          | [`0x0105543D716AbE2dc96c41d6AEA913a3A0603eFA`](https://evmtestnet.confluxscan.org/address/0x0105543D716AbE2dc96c41d6AEA913a3A0603eFA)                 |
| `dForce Strategy (Mock)`     | [`0x6926165994325ABC6e551af84EdCBab98Af4eFe3`](https://evmtestnet.confluxscan.org/address/0x6926165994325ABC6e551af84EdCBab98Af4eFe3)                 |
| `SHUI Strategy (Mock)`       | [`0xF94A8F5CfA9E0FD1D0920419b936181eC1790be8`](https://evmtestnet.confluxscan.org/address/0xF94A8F5CfA9E0FD1D0920419b936181eC1790be8)                 |
| `WallFreeX Strategy (Mock)`  | [`0xF0A7dbCCBcB3F315103cf7e6368A5b0CdBCf0e10`](https://evmtestnet.confluxscan.org/address/0xF0A7dbCCBcB3F315103cf7e6368A5b0CdBCf0e10)                 |

### Mainnet (Conflux eSpace — Chain ID: 1030)

| Contract            | Address                    |
| ------------------- | -------------------------- |
| `ConfluxMindVault`  | Post-hackathon deployment  |
| `StrategyController`| Post-hackathon deployment  |

*All contracts verified on [ConfluxScan](https://evmtestnet.confluxscan.org)*

---

## Future Improvements

- **Multi-chain Vault Entry** — Accept deposits from Ethereum, Base, and Arbitrum via LayerZero USDT0 or Meson.fi in a single cross-chain transaction; settlement on Conflux eSpace
- **Risk Tiers** — Conservative / Balanced / Aggressive vault variants with different strategy weight constraints
- **On-chain Governance** — CFX-holder governance to vote on strategy whitelisting and fee parameters
- **Additional Strategy Integrations** — Swappi, GinsengSwap, Orbit Finance, KinetFlow liquidity provisioning
- **Keeper Decentralization** — Replace single permissioned Keeper with a decentralized keeper network with slashable bonds
- **Mobile Support** — React Native app with Fluent Wallet deep-link integration
- **Known Limitations:** Current Keeper is centralized (single EOA signer); rate oracle is pulled directly from contract state rather than a TWAP — mitigations planned for post-hackathon production release

---

## License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.

---

## Acknowledgments

- **Conflux Network** — For the Gas Sponsorship mechanism and eSpace infrastructure that makes gasless DeFi UX possible
- **dForce** — For Unitus lending market contracts and the "DeFAI era" vision that ConfluxMind realizes
- **SHUI Finance** — For the sFX liquid staking primitive and integration support
- **WallFreeX** — For the stablecoin LP infrastructure on Conflux eSpace
- **Meson.fi** — For cross-chain bridging that enables seamless asset entry to Conflux
- **OpenZeppelin** — ERC-4626 base implementation and security patterns
- **Foundry** — For the Solidity testing and deployment framework
- **Tenderly** — For contract monitoring and alerting on Conflux eSpace
