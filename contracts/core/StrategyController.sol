// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IStrategy} from "../interfaces/IStrategy.sol";

/// @title StrategyController - Manages weighted allocation across yield strategies
/// @notice Validates Keeper-signed rebalance calls and executes atomic rebalances
/// @dev Only the Keeper (permissioned EOA) or owner can trigger rebalances
contract StrategyController is Ownable {
    using SafeERC20 for IERC20;

    /// @notice The underlying asset managed by this controller
    IERC20 public immutable asset;

    /// @notice The vault contract that owns the assets
    address public vault;

    /// @notice The authorized Keeper address
    address public keeper;

    /// @notice Registered strategies
    IStrategy[] public strategies;

    /// @notice Current allocation weight for each strategy (in basis points, must sum to 10000)
    mapping(uint256 => uint256) public strategyWeights;

    /// @notice Whether a strategy address is registered
    mapping(address => bool) public isRegistered;

    /// @notice Index of a strategy address in the strategies array
    mapping(address => uint256) public strategyIndex;

    /// @notice Minimum time between rebalances (anti-spam)
    uint256 public rebalanceCooldown = 5 minutes;

    /// @notice Timestamp of last rebalance
    uint256 public lastRebalanceTime;

    /// @notice Circuit breaker — when true, only emergency withdrawal is allowed
    bool public emergencyMode;

    /// @notice Minimum weight delta to justify a rebalance (in bps)
    uint256 public rebalanceThresholdBps = 50;

    event StrategyAdded(address indexed strategy, string name);
    event StrategyRemoved(address indexed strategy);
    event Rebalanced(uint256[] newWeights, uint256 timestamp);
    event KeeperUpdated(address indexed oldKeeper, address indexed newKeeper);
    event EmergencyModeActivated(address indexed triggeredBy);
    event EmergencyModeDeactivated(address indexed triggeredBy);
    event VaultUpdated(address indexed vault);

    modifier onlyKeeper() {
        require(msg.sender == keeper, "Only keeper");
        _;
    }

    modifier onlyVaultOrOwner() {
        require(msg.sender == vault || msg.sender == owner(), "Only vault or owner");
        _;
    }

    modifier notEmergency() {
        require(!emergencyMode, "Emergency mode active");
        _;
    }

    constructor(address _asset, address _keeper) Ownable(msg.sender) {
        require(_asset != address(0), "Invalid asset");
        require(_keeper != address(0), "Invalid keeper");
        asset = IERC20(_asset);
        keeper = _keeper;
    }

    /// @notice Set the vault address
    function setVault(address _vault) external onlyOwner {
        require(_vault != address(0), "Invalid vault");
        vault = _vault;
        emit VaultUpdated(_vault);
    }

    /// @notice Register a new strategy
    function addStrategy(address strategy) external onlyOwner {
        require(strategy != address(0), "Invalid strategy");
        require(!isRegistered[strategy], "Already registered");

        uint256 idx = strategies.length;
        strategies.push(IStrategy(strategy));
        isRegistered[strategy] = true;
        strategyIndex[strategy] = idx;
        strategyWeights[idx] = 0;

        emit StrategyAdded(strategy, IStrategy(strategy).name());
    }

    /// @notice Remove a strategy (must have zero allocation first)
    function removeStrategy(address strategy) external onlyOwner {
        require(isRegistered[strategy], "Not registered");
        uint256 idx = strategyIndex[strategy];
        require(strategyWeights[idx] == 0, "Withdraw from strategy first");

        // Swap with last and pop
        uint256 lastIdx = strategies.length - 1;
        if (idx != lastIdx) {
            IStrategy lastStrategy = strategies[lastIdx];
            strategies[idx] = lastStrategy;
            strategyIndex[address(lastStrategy)] = idx;
            strategyWeights[idx] = strategyWeights[lastIdx];
        }
        strategies.pop();
        delete strategyWeights[lastIdx];
        delete isRegistered[strategy];
        delete strategyIndex[strategy];

        emit StrategyRemoved(strategy);
    }

    /// @notice Rebalance allocations across strategies
    /// @param newWeights Array of new weights in bps (must sum to 10000)
    function rebalance(uint256[] calldata newWeights) external onlyKeeper notEmergency {
        require(newWeights.length == strategies.length, "Weight count mismatch");
        require(block.timestamp >= lastRebalanceTime + rebalanceCooldown, "Cooldown not elapsed");

        uint256 totalWeight;
        for (uint256 i; i < newWeights.length; i++) {
            totalWeight += newWeights[i];
        }
        require(totalWeight == 10000, "Weights must sum to 10000");

        uint256 totalVal = totalStrategyAssets();

        // First: withdraw everything from strategies that are decreasing
        for (uint256 i; i < strategies.length; i++) {
            uint256 currentVal = strategies[i].totalAssets();
            uint256 targetVal = (totalVal * newWeights[i]) / 10000;

            if (targetVal < currentVal) {
                uint256 withdrawAmt = currentVal - targetVal;
                strategies[i].withdraw(withdrawAmt);
            }
        }

        // Second: deposit into strategies that are increasing
        for (uint256 i; i < strategies.length; i++) {
            uint256 currentVal = strategies[i].totalAssets();
            uint256 targetVal = (totalVal * newWeights[i]) / 10000;

            if (targetVal > currentVal) {
                uint256 depositAmt = targetVal - currentVal;
                uint256 available = asset.balanceOf(address(this));
                if (depositAmt > available) depositAmt = available;
                if (depositAmt > 0) {
                    asset.safeTransfer(address(strategies[i]), depositAmt);
                    strategies[i].deposit(depositAmt);
                }
            }

            strategyWeights[i] = newWeights[i];
        }

        lastRebalanceTime = block.timestamp;
        emit Rebalanced(newWeights, block.timestamp);
    }

    /// @notice Deposit assets into strategies according to current weights
    /// @param amount Total amount to allocate
    function allocate(uint256 amount) external onlyVaultOrOwner notEmergency {
        require(strategies.length > 0, "No strategies");

        uint256 remaining = amount;
        for (uint256 i; i < strategies.length; i++) {
            uint256 alloc;
            if (i == strategies.length - 1) {
                alloc = remaining; // Last strategy gets remainder to avoid rounding dust
            } else {
                alloc = (amount * strategyWeights[i]) / 10000;
                if (alloc > remaining) alloc = remaining;
            }

            if (alloc > 0 && strategyWeights[i] > 0) {
                asset.safeTransfer(address(strategies[i]), alloc);
                strategies[i].deposit(alloc);
                remaining -= alloc;
            }
        }
    }

    /// @notice Withdraw assets from strategies proportionally
    /// @param amount Total amount to withdraw
    /// @return withdrawn Actual amount withdrawn
    function deallocate(uint256 amount) external onlyVaultOrOwner returns (uint256 withdrawn) {
        uint256 total = totalStrategyAssets();
        if (total == 0) return 0;

        for (uint256 i; i < strategies.length; i++) {
            uint256 stratAssets = strategies[i].totalAssets();
            uint256 share = (amount * stratAssets) / total;
            if (share > 0) {
                withdrawn += strategies[i].withdraw(share);
            }
        }

        // Transfer withdrawn assets back to caller (vault)
        if (withdrawn > 0) {
            asset.safeTransfer(msg.sender, withdrawn);
        }
    }

    /// @notice Emergency: withdraw everything from all strategies
    function emergencyWithdrawAll() external onlyOwner {
        emergencyMode = true;
        emit EmergencyModeActivated(msg.sender);

        for (uint256 i; i < strategies.length; i++) {
            if (strategies[i].totalAssets() > 0) {
                strategies[i].emergencyWithdraw();
            }
        }

        // Transfer all recovered assets to vault
        uint256 balance = asset.balanceOf(address(this));
        if (balance > 0 && vault != address(0)) {
            asset.safeTransfer(vault, balance);
        }
    }

    /// @notice Deactivate emergency mode
    function deactivateEmergency() external onlyOwner {
        emergencyMode = false;
        emit EmergencyModeDeactivated(msg.sender);
    }

    /// @notice Harvest rewards from all strategies
    function harvestAll() external onlyKeeper returns (uint256 totalHarvested) {
        for (uint256 i; i < strategies.length; i++) {
            totalHarvested += strategies[i].harvest();
        }
    }

    /// @notice Total value of assets across all strategies
    function totalStrategyAssets() public view returns (uint256 total) {
        for (uint256 i; i < strategies.length; i++) {
            total += strategies[i].totalAssets();
        }
    }

    /// @notice Get current APY estimates from all strategies
    function getStrategyAPYs() external view returns (uint256[] memory apys) {
        apys = new uint256[](strategies.length);
        for (uint256 i; i < strategies.length; i++) {
            apys[i] = strategies[i].estimatedAPY();
        }
    }

    /// @notice Get current weights
    function getWeights() external view returns (uint256[] memory weights) {
        weights = new uint256[](strategies.length);
        for (uint256 i; i < strategies.length; i++) {
            weights[i] = strategyWeights[i];
        }
    }

    /// @notice Get all registered strategy addresses
    function getStrategies() external view returns (address[] memory addrs) {
        addrs = new address[](strategies.length);
        for (uint256 i; i < strategies.length; i++) {
            addrs[i] = address(strategies[i]);
        }
    }

    /// @notice Update the Keeper address
    function setKeeper(address _keeper) external onlyOwner {
        require(_keeper != address(0), "Invalid keeper");
        emit KeeperUpdated(keeper, _keeper);
        keeper = _keeper;
    }

    /// @notice Update rebalance cooldown
    function setRebalanceCooldown(uint256 _cooldown) external onlyOwner {
        rebalanceCooldown = _cooldown;
    }

    /// @notice Update rebalance threshold
    function setRebalanceThresholdBps(uint256 _threshold) external onlyOwner {
        require(_threshold <= 1000, "Threshold too high");
        rebalanceThresholdBps = _threshold;
    }

    /// @notice Number of registered strategies
    function strategyCount() external view returns (uint256) {
        return strategies.length;
    }
}
