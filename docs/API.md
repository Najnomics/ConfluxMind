# ConfluxMind Smart Contract API

## ConfluxMindVault (ERC-4626)

### Read Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `totalAssets()` | `uint256` | Total assets under management (idle + deployed) |
| `balanceOf(address)` | `uint256` | cmToken shares held by user |
| `previewDeposit(uint256 assets)` | `uint256 shares` | Preview shares received for deposit |
| `previewRedeem(uint256 shares)` | `uint256 assets` | Preview assets received for redeem |
| `convertToShares(uint256 assets)` | `uint256 shares` | Convert asset amount to shares |
| `convertToAssets(uint256 shares)` | `uint256 assets` | Convert shares to asset amount |
| `maxDeposit(address)` | `uint256` | Max deposit allowed |
| `maxWithdraw(address owner)` | `uint256` | Max withdrawal for owner |
| `protocolFeeBps()` | `uint256` | Current protocol fee in bps |
| `paused()` | `bool` | Whether deposits are paused |

### Write Functions

| Function | Params | Description |
|----------|--------|-------------|
| `deposit(uint256 assets, address receiver)` | Amount, recipient | Deposit assets, receive cmTokens |
| `withdraw(uint256 assets, address receiver, address owner)` | Amount, recipient, share owner | Withdraw assets |
| `redeem(uint256 shares, address receiver, address owner)` | Shares, recipient, share owner | Redeem shares for assets |

### Events

- `Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)`
- `Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)`

---

## StrategyController

### Read Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `totalStrategyAssets()` | `uint256` | Total value across all strategies |
| `getStrategies()` | `address[]` | All registered strategy addresses |
| `getWeights()` | `uint256[]` | Current allocation weights (bps) |
| `getStrategyAPYs()` | `uint256[]` | Current APY estimates (bps) |
| `strategyCount()` | `uint256` | Number of registered strategies |
| `keeper()` | `address` | Current keeper address |
| `emergencyMode()` | `bool` | Whether emergency mode is active |
| `lastRebalanceTime()` | `uint256` | Timestamp of last rebalance |

### Write Functions (Keeper only)

| Function | Params | Description |
|----------|--------|-------------|
| `rebalance(uint256[] weights)` | New weights (sum to 10000) | Rebalance strategy allocations |
| `harvestAll()` | — | Harvest rewards from all strategies |

### Write Functions (Owner only)

| Function | Params | Description |
|----------|--------|-------------|
| `addStrategy(address)` | Strategy address | Register new strategy |
| `removeStrategy(address)` | Strategy address | Remove strategy (must have 0 allocation) |
| `emergencyWithdrawAll()` | — | Emergency: pull all assets from all strategies |
| `setKeeper(address)` | New keeper | Update keeper address |

### Events

- `Rebalanced(uint256[] newWeights, uint256 timestamp)`
- `StrategyAdded(address indexed strategy, string name)`
- `EmergencyModeActivated(address indexed triggeredBy)`

---

## GasSponsorManager

### Read Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `getSponsorBalance(address contract)` | `uint256` | Remaining gas sponsor balance |
| `getSponsoredContracts()` | `address[]` | All sponsored contracts |
| `isUserWhitelisted(address contract, address user)` | `bool` | Whether user is whitelisted |

### Write Functions (Owner only)

| Function | Params | Description |
|----------|--------|-------------|
| `sponsorContract(address, uint256)` | Contract, gas upper bound | Sponsor a contract (payable) |
| `fundGasSponsor(address)` | Contract | Add more gas funds (payable) |

---

## Conflux eSpace Network Config

| Network | Chain ID | RPC URL | Explorer |
|---------|----------|---------|----------|
| Mainnet | 1030 | https://evm.confluxrpc.com | https://evm.confluxscan.io |
| Testnet | 71 | https://evmtestnet.confluxrpc.com | https://evmtestnet.confluxscan.io |
