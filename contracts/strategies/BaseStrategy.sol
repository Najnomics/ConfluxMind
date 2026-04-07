// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IStrategy} from "../interfaces/IStrategy.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title BaseStrategy - Abstract base for all yield strategy adapters
/// @notice Provides common logic: access control, asset management, controller integration
abstract contract BaseStrategy is IStrategy, Ownable {
    using SafeERC20 for IERC20;

    /// @notice The underlying asset
    IERC20 public immutable underlyingAsset;

    /// @notice The strategy controller that manages this strategy
    address public controller;

    /// @notice Whether this strategy is accepting new deposits
    bool public active = true;

    /// @notice Total assets deposited into the external protocol
    uint256 internal _totalDeposited;

    modifier onlyController() {
        require(msg.sender == controller, "Only controller");
        _;
    }

    constructor(address _asset, address _controller) Ownable(msg.sender) {
        require(_asset != address(0), "Invalid asset");
        require(_controller != address(0), "Invalid controller");
        underlyingAsset = IERC20(_asset);
        controller = _controller;
    }

    function asset() external view override returns (address) {
        return address(underlyingAsset);
    }

    function isActive() external view override returns (bool) {
        return active;
    }

    function deposit(uint256 amount) external override onlyController {
        require(active, "Strategy inactive");
        require(amount > 0, "Zero amount");
        _deposit(amount);
        _totalDeposited += amount;
    }

    function withdraw(uint256 amount) external override onlyController returns (uint256) {
        require(amount > 0, "Zero amount");
        uint256 actual = _withdraw(amount);
        if (actual > _totalDeposited) {
            _totalDeposited = 0;
        } else {
            _totalDeposited -= actual;
        }
        underlyingAsset.safeTransfer(controller, actual);
        return actual;
    }

    function harvest() external override onlyController returns (uint256) {
        return _harvest();
    }

    function emergencyWithdraw() external override onlyController returns (uint256) {
        active = false;
        uint256 recovered = _emergencyWithdraw();
        _totalDeposited = 0;
        underlyingAsset.safeTransfer(controller, recovered);
        return recovered;
    }

    function setActive(bool _active) external onlyOwner {
        active = _active;
    }

    function setController(address _controller) external onlyOwner {
        require(_controller != address(0), "Invalid controller");
        controller = _controller;
    }

    // --- Abstract methods for subclasses ---

    function _deposit(uint256 amount) internal virtual;
    function _withdraw(uint256 amount) internal virtual returns (uint256 actual);
    function _harvest() internal virtual returns (uint256 harvested);
    function _emergencyWithdraw() internal virtual returns (uint256 recovered);
}
