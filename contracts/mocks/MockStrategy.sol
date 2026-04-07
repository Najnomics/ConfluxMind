// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IStrategy} from "../interfaces/IStrategy.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title MockStrategy - Mock strategy for testing
contract MockStrategy is IStrategy {
    using SafeERC20 for IERC20;

    IERC20 public underlyingAsset;
    string public _name;
    uint256 public _apy;
    uint256 public _totalDeposited;
    bool public _active = true;

    constructor(address _asset, string memory strategyName, uint256 apy) {
        underlyingAsset = IERC20(_asset);
        _name = strategyName;
        _apy = apy;
    }

    function name() external view override returns (string memory) {
        return _name;
    }

    function asset() external view override returns (address) {
        return address(underlyingAsset);
    }

    function deposit(uint256 amount) external override {
        _totalDeposited += amount;
    }

    function withdraw(uint256 amount) external override returns (uint256) {
        if (amount > _totalDeposited) amount = _totalDeposited;
        _totalDeposited -= amount;
        underlyingAsset.safeTransfer(msg.sender, amount);
        return amount;
    }

    function totalAssets() external view override returns (uint256) {
        return _totalDeposited;
    }

    function estimatedAPY() external view override returns (uint256) {
        return _apy;
    }

    function harvest() external override returns (uint256) {
        return 0;
    }

    function emergencyWithdraw() external override returns (uint256) {
        uint256 amount = _totalDeposited;
        _totalDeposited = 0;
        _active = false;
        underlyingAsset.safeTransfer(msg.sender, amount);
        return amount;
    }

    function isActive() external view override returns (bool) {
        return _active;
    }

    /// @notice Simulate yield accrual for testing
    function simulateYield(uint256 amount) external {
        _totalDeposited += amount;
    }
}
