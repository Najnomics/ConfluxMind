# ConfluxMind Architecture

## System Overview

ConfluxMind is a three-layer autonomous yield optimization protocol on Conflux eSpace.

```
User (Wallet)
    │
    ▼ deposit / withdraw (gasless)
ConfluxMindVault.sol (ERC-4626)
    │
    ▼ allocate / deallocate
StrategyController.sol
    │
    ├──▶ dForce Unitus Adapter (lending yield)
    ├──▶ SHUI Finance Adapter (CFX staking yield)
    └──▶ WallFreeX Adapter (LP fee yield)

    ▲ rebalance(weights[])
    │
AI Keeper (off-chain, Node.js)
```

## Layer 1: Vault Layer

**Contract:** `ConfluxMindVault.sol`

- ERC-4626 compliant vault
- Accepts USDT0, AxCNH, or CFX deposits
- Mints `cmTokens` (shares) representing proportional ownership
- Delegates asset management to StrategyController
- Protocol fee (10% of yield) collected on harvest
- Emergency pause blocks deposits but allows withdrawals

**Key Properties:**
- Non-custodial: no admin can access user funds
- Share accounting follows OpenZeppelin ERC-4626 standard
- Composable with any protocol that reads ERC-4626

## Layer 2: Strategy Layer

**Contract:** `StrategyController.sol`

- Maintains weighted allocation across registered strategies
- Validates Keeper rebalance calls (only authorized Keeper can trigger)
- Executes atomic rebalances: withdraw from decreasing, deposit to increasing
- 5-minute cooldown between rebalances (anti-spam)
- Emergency mode: withdraw all from all strategies

**Strategy Adapters** (all implement `IStrategy`):

| Adapter | Protocol | Yield Source |
|---------|----------|--------------|
| `DForceUnitusAdapter` | dForce Unitus | Lending interest (auto-compounds via iToken exchange rate) |
| `SHUIFinanceAdapter` | SHUI Finance | CFX staking yield (auto-compounds via sFX exchange rate) |
| `WallFreeXAdapter` | WallFreeX | Stablecoin LP swap fees |

## Layer 3: Gasless UX Layer

**Contract:** `GasSponsorManager.sol`

- Uses Conflux's `SponsorWhitelistControl` built-in contract (`0x0888...0001`)
- Sponsors gas + storage collateral for all user-facing transactions
- Whitelists all users (address(0) wildcard)
- Funded from protocol fee revenue

**User Impact:** Zero CFX balance required to deposit, withdraw, or claim yield.

## Off-Chain: AI Keeper

**Service:** `src/keeper/`

- Polls on-chain state every 5 minutes
- Reads current APYs from each strategy adapter
- Computes optimal allocation using risk-adjusted yield model
- Only rebalances when yield delta exceeds 50bps threshold
- Signs and submits `rebalance(weights[])` to StrategyController
- Logs all decisions with reasoning for transparency

**Keeper Properties:**
- Permissioned but non-custodial: can only call `rebalance()`, never touch user funds
- Single EOA signer (centralization trade-off acknowledged, decentralization planned post-hackathon)
- Rate data pulled directly from contract state (not TWAP — known limitation)

## Security Model

| Risk | Mitigation |
|------|-----------|
| Keeper compromise | Keeper can only rebalance, never withdraw. Emergency mode requires owner multisig. |
| Strategy exploit | Emergency withdrawal circuit breaker. Strategy adapters are isolated. |
| Reentrancy | ReentrancyGuard on all vault entry points. |
| Flash loan attack | Minimum deposit amount. Share price based on totalAssets(). |
| Governance | Owner is deployer EOA for hackathon. Multisig planned for mainnet. |

## Data Flow

### Deposit Flow
1. User calls `vault.deposit(amount, receiver)` — gas sponsored
2. Vault mints cmTokens proportional to `previewDeposit(amount)`
3. Vault calls `controller.allocate(amount)`
4. Controller distributes to strategies per current weights

### Withdrawal Flow
1. User calls `vault.withdraw(amount, receiver, owner)` — gas sponsored
2. Vault checks idle balance; if insufficient, calls `controller.deallocate(needed)`
3. Controller pulls from strategies proportionally
4. Vault burns cmTokens and transfers underlying to user

### Rebalance Flow
1. Keeper polls `controller.getStrategyAPYs()` and `controller.getWeights()`
2. AI model computes new optimal weights
3. If delta > threshold, Keeper calls `controller.rebalance(newWeights)`
4. Controller atomically: withdraw from decreasing → deposit to increasing
5. Event `Rebalanced(weights, timestamp)` emitted for frontend display
