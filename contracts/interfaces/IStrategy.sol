// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IStrategy - Common interface for all yield strategy adapters
/// @notice Each strategy adapter (dForce, SHUI, WallFreeX) implements this interface
interface IStrategy {
    /// @notice Returns the name of this strategy
    function name() external view returns (string memory);

    /// @notice Returns the underlying asset this strategy operates on
    function asset() external view returns (address);

    /// @notice Deposits assets into the external protocol
    /// @param amount The amount of underlying asset to deposit
    function deposit(uint256 amount) external;

    /// @notice Withdraws assets from the external protocol
    /// @param amount The amount of underlying asset to withdraw
    /// @return actualAmount The actual amount withdrawn (may differ due to fees/slippage)
    function withdraw(uint256 amount) external returns (uint256 actualAmount);

    /// @notice Returns the total value of assets held by this strategy, denominated in the underlying asset
    function totalAssets() external view returns (uint256);

    /// @notice Returns the current estimated APY in basis points (1 bps = 0.01%)
    function estimatedAPY() external view returns (uint256);

    /// @notice Harvests any pending rewards and reinvests them
    /// @return harvested The amount of rewards harvested (in underlying asset terms)
    function harvest() external returns (uint256 harvested);

    /// @notice Emergency withdrawal — pulls all assets with no regard for optimal execution
    /// @return recovered The amount of assets recovered
    function emergencyWithdraw() external returns (uint256 recovered);

    /// @notice Whether this strategy is currently active and accepting deposits
    function isActive() external view returns (bool);
}
