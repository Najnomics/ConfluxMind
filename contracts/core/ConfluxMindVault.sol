// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {StrategyController} from "./StrategyController.sol";

/// @title ConfluxMindVault - ERC-4626 Vault with AI-driven yield optimization
/// @notice Accepts user deposits, mints cmTokens (shares), and routes assets to StrategyController
/// @dev Non-custodial; all assets are managed through strategies. Gasless via Conflux Fee Sponsorship.
contract ConfluxMindVault is ERC4626, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice The strategy controller that manages yield allocation
    StrategyController public strategyController;

    /// @notice Protocol fee in basis points (applied to yield only)
    uint256 public protocolFeeBps = 1000; // 10%

    /// @notice Address that receives protocol fees
    address public feeRecipient;

    /// @notice Total fees accumulated and not yet claimed
    uint256 public accumulatedFees;

    /// @notice Emergency pause — blocks deposits but allows withdrawals
    bool public paused;

    /// @notice Minimum deposit amount to prevent dust attacks
    uint256 public minDeposit = 1e6; // 1 USDT (6 decimals)

    event StrategyControllerUpdated(address indexed controller);
    event ProtocolFeeUpdated(uint256 newFeeBps);
    event FeeRecipientUpdated(address indexed recipient);
    event FeesCollected(uint256 amount);
    event Paused(address indexed by);
    event Unpaused(address indexed by);

    modifier whenNotPaused() {
        require(!paused, "Vault is paused");
        _;
    }

    constructor(
        IERC20 _asset,
        string memory _name,
        string memory _symbol,
        address _strategyController,
        address _feeRecipient
    ) ERC4626(_asset) ERC20(_name, _symbol) Ownable(msg.sender) {
        require(_strategyController != address(0), "Invalid controller");
        require(_feeRecipient != address(0), "Invalid fee recipient");

        strategyController = StrategyController(_strategyController);
        feeRecipient = _feeRecipient;
    }

    /// @notice Total assets under management: idle balance + strategy allocations
    function totalAssets() public view override returns (uint256) {
        uint256 idle = IERC20(asset()).balanceOf(address(this));
        uint256 deployed = strategyController.totalStrategyAssets();
        return idle + deployed - accumulatedFees;
    }

    /// @notice Deposit assets and allocate to strategies
    function deposit(uint256 assets, address receiver)
        public
        override
        whenNotPaused
        nonReentrant
        returns (uint256 shares)
    {
        require(assets >= minDeposit, "Below minimum deposit");
        shares = super.deposit(assets, receiver);
        _deployToStrategies();
    }

    /// @notice Mint exact shares
    function mint(uint256 shares, address receiver)
        public
        override
        whenNotPaused
        nonReentrant
        returns (uint256 assets)
    {
        assets = super.mint(shares, receiver);
        require(assets >= minDeposit, "Below minimum deposit");
        _deployToStrategies();
    }

    /// @notice Withdraw assets — pulls from strategies if needed
    function withdraw(uint256 assets, address receiver, address _owner)
        public
        override
        nonReentrant
        returns (uint256 shares)
    {
        _ensureLiquidity(assets);
        shares = super.withdraw(assets, receiver, _owner);
    }

    /// @notice Redeem shares for assets — pulls from strategies if needed
    function redeem(uint256 shares, address receiver, address _owner)
        public
        override
        nonReentrant
        returns (uint256 assets)
    {
        assets = previewRedeem(shares);
        _ensureLiquidity(assets);
        assets = super.redeem(shares, receiver, _owner);
    }

    /// @notice Deploy idle assets to strategy controller
    function _deployToStrategies() internal {
        uint256 idle = IERC20(asset()).balanceOf(address(this));
        if (idle > accumulatedFees && idle - accumulatedFees > minDeposit) {
            uint256 deployable = idle - accumulatedFees;
            IERC20(asset()).safeTransfer(address(strategyController), deployable);
            strategyController.allocate(deployable);
        }
    }

    /// @notice Ensure the vault has enough liquidity for a withdrawal
    function _ensureLiquidity(uint256 amount) internal {
        uint256 idle = IERC20(asset()).balanceOf(address(this));
        if (idle < amount + accumulatedFees) {
            uint256 needed = amount + accumulatedFees - idle;
            strategyController.deallocate(needed);
        }
    }

    /// @notice Collect protocol fees (called by keeper after harvest)
    /// @param yieldAmount The amount of new yield harvested
    function collectFees(uint256 yieldAmount) external {
        require(msg.sender == address(strategyController) || msg.sender == owner(), "Unauthorized");
        uint256 fee = (yieldAmount * protocolFeeBps) / 10000;
        accumulatedFees += fee;
    }

    /// @notice Claim accumulated fees to fee recipient
    function claimFees() external {
        require(msg.sender == feeRecipient || msg.sender == owner(), "Unauthorized");
        uint256 fees = accumulatedFees;
        require(fees > 0, "No fees to claim");

        accumulatedFees = 0;
        _ensureLiquidity(fees);
        IERC20(asset()).safeTransfer(feeRecipient, fees);

        emit FeesCollected(fees);
    }

    /// @notice Emergency pause — blocks deposits
    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    /// @notice Unpause
    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

    /// @notice Update strategy controller
    function setStrategyController(address _controller) external onlyOwner {
        require(_controller != address(0), "Invalid controller");
        strategyController = StrategyController(_controller);
        emit StrategyControllerUpdated(_controller);
    }

    /// @notice Update protocol fee (max 20%)
    function setProtocolFeeBps(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 2000, "Fee too high");
        protocolFeeBps = _feeBps;
        emit ProtocolFeeUpdated(_feeBps);
    }

    /// @notice Update fee recipient
    function setFeeRecipient(address _recipient) external onlyOwner {
        require(_recipient != address(0), "Invalid recipient");
        feeRecipient = _recipient;
        emit FeeRecipientUpdated(_recipient);
    }

    /// @notice Update minimum deposit
    function setMinDeposit(uint256 _minDeposit) external onlyOwner {
        minDeposit = _minDeposit;
    }
}
