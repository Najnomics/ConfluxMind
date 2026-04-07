// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseStrategy} from "./BaseStrategy.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title IiToken - dForce Unitus lending market interface
interface IiToken {
    function mint(address recipient, uint256 mintAmount) external;
    function redeem(address from, uint256 redeemTokens) external;
    function redeemUnderlying(address from, uint256 redeemAmount) external;
    function balanceOf(address owner) external view returns (uint256);
    function exchangeRateCurrent() external returns (uint256);
    function exchangeRateStored() external view returns (uint256);
    function supplyRatePerBlock() external view returns (uint256);
    function underlying() external view returns (address);
}

/// @title DForceUnitusAdapter - Yield strategy for dForce Unitus lending markets
/// @notice Deposits assets into Unitus lending pools to earn interest
/// @dev Integrates with dForce's iToken (interest-bearing token) interface
contract DForceUnitusAdapter is BaseStrategy {
    using SafeERC20 for IERC20;

    /// @notice The dForce iToken for the underlying asset
    IiToken public immutable iToken;

    /// @notice Blocks per year on Conflux eSpace (~1 block per second)
    uint256 public constant BLOCKS_PER_YEAR = 31_536_000;

    constructor(address _asset, address _controller, address _iToken) BaseStrategy(_asset, _controller) {
        require(_iToken != address(0), "Invalid iToken");
        iToken = IiToken(_iToken);
    }

    function name() external pure override returns (string memory) {
        return "dForce Unitus Lending";
    }

    function totalAssets() external view override returns (uint256) {
        uint256 iTokenBalance = iToken.balanceOf(address(this));
        uint256 exchangeRate = iToken.exchangeRateStored();
        return (iTokenBalance * exchangeRate) / 1e18;
    }

    function estimatedAPY() external view override returns (uint256) {
        uint256 ratePerBlock = iToken.supplyRatePerBlock();
        // APY in bps: ((1 + ratePerBlock)^blocksPerYear - 1) * 10000
        // Simplified linear approximation: ratePerBlock * blocksPerYear * 10000 / 1e18
        return (ratePerBlock * BLOCKS_PER_YEAR * 10000) / 1e18;
    }

    function _deposit(uint256 amount) internal override {
        underlyingAsset.approve(address(iToken), amount);
        iToken.mint(address(this), amount);
    }

    function _withdraw(uint256 amount) internal override returns (uint256) {
        uint256 before = underlyingAsset.balanceOf(address(this));
        iToken.redeemUnderlying(address(this), amount);
        uint256 actual = underlyingAsset.balanceOf(address(this)) - before;
        return actual;
    }

    function _harvest() internal override returns (uint256) {
        // dForce auto-compounds — interest accrues in iToken exchange rate
        // No explicit harvest needed; the totalAssets() reflects compounded value
        return 0;
    }

    function _emergencyWithdraw() internal override returns (uint256) {
        uint256 iTokenBalance = iToken.balanceOf(address(this));
        if (iTokenBalance > 0) {
            uint256 before = underlyingAsset.balanceOf(address(this));
            iToken.redeem(address(this), iTokenBalance);
            return underlyingAsset.balanceOf(address(this)) - before;
        }
        return 0;
    }
}
