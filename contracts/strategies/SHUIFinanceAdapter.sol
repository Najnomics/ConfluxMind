// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseStrategy} from "./BaseStrategy.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title ISHUIStaking - SHUI Finance liquid staking interface
interface ISHUIStaking {
    function stake() external payable returns (uint256 sFXAmount);
    function unstake(uint256 sFXAmount) external returns (uint256 cfxAmount);
    function getExchangeRate() external view returns (uint256);
    function totalStaked() external view returns (uint256);
    function getStakingAPY() external view returns (uint256);
}

/// @title ISFX - sFX (staked CFX) token interface
interface ISFX is IERC20 {
    function getSharesByPooledCFX(uint256 cfxAmount) external view returns (uint256);
    function getPooledCFXByShares(uint256 sharesAmount) external view returns (uint256);
}

/// @title IWCFX - Wrapped CFX interface for eSpace
interface IWCFX {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
}

/// @title SHUIFinanceAdapter - Yield strategy for SHUI Finance CFX liquid staking
/// @notice Converts CFX deposits to sFX for staking yield
/// @dev Handles WCFX <-> CFX conversion for eSpace compatibility
contract SHUIFinanceAdapter is BaseStrategy {
    using SafeERC20 for IERC20;

    ISHUIStaking public immutable shuiStaking;
    ISFX public immutable sFX;
    IWCFX public immutable wCFX;

    constructor(
        address _wCFX,
        address _controller,
        address _shuiStaking,
        address _sFX
    ) BaseStrategy(_wCFX, _controller) {
        require(_shuiStaking != address(0), "Invalid staking");
        require(_sFX != address(0), "Invalid sFX");
        shuiStaking = ISHUIStaking(_shuiStaking);
        sFX = ISFX(_sFX);
        wCFX = IWCFX(_wCFX);
    }

    function name() external pure override returns (string memory) {
        return "SHUI Finance CFX Staking";
    }

    function totalAssets() external view override returns (uint256) {
        uint256 sFXBalance = sFX.balanceOf(address(this));
        if (sFXBalance == 0) return 0;
        return sFX.getPooledCFXByShares(sFXBalance);
    }

    function estimatedAPY() external view override returns (uint256) {
        return shuiStaking.getStakingAPY();
    }

    function _deposit(uint256 amount) internal override {
        // Unwrap WCFX to native CFX
        wCFX.withdraw(amount);
        // Stake CFX to get sFX
        shuiStaking.stake{value: amount}();
    }

    function _withdraw(uint256 amount) internal override returns (uint256) {
        // Convert desired CFX amount to sFX shares
        uint256 sharesToUnstake = sFX.getSharesByPooledCFX(amount);
        uint256 sFXBalance = sFX.balanceOf(address(this));
        if (sharesToUnstake > sFXBalance) sharesToUnstake = sFXBalance;

        // Unstake to get CFX
        uint256 cfxReceived = shuiStaking.unstake(sharesToUnstake);

        // Wrap CFX back to WCFX
        wCFX.deposit{value: cfxReceived}();
        return cfxReceived;
    }

    function _harvest() internal override returns (uint256) {
        // SHUI auto-compounds — staking yield accrues in sFX exchange rate
        return 0;
    }

    function _emergencyWithdraw() internal override returns (uint256) {
        uint256 sFXBalance = sFX.balanceOf(address(this));
        if (sFXBalance == 0) return 0;

        uint256 cfxReceived = shuiStaking.unstake(sFXBalance);
        wCFX.deposit{value: cfxReceived}();
        return cfxReceived;
    }

    /// @notice Allow receiving native CFX for unstaking
    receive() external payable {}
}
