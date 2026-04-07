// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseStrategy} from "./BaseStrategy.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title IWallFreeXRouter - WallFreeX AMM router interface
interface IWallFreeXRouter {
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity);

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB);

    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory);
}

/// @title IWallFreeXPair - WallFreeX LP pair interface
interface IWallFreeXPair is IERC20 {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function totalSupply() external view returns (uint256);
}

/// @title WallFreeXAdapter - Yield strategy for WallFreeX stablecoin LP
/// @notice Provides liquidity to AxCNH/USDT0 pool on WallFreeX and earns swap fees
contract WallFreeXAdapter is BaseStrategy {
    using SafeERC20 for IERC20;

    IWallFreeXRouter public immutable router;
    IWallFreeXPair public immutable lpPair;

    /// @notice The paired token in the LP (e.g., AxCNH paired with USDT0)
    IERC20 public immutable pairedToken;

    /// @notice Slippage tolerance in bps (default 100 = 1%)
    uint256 public slippageBps = 100;

    /// @notice Estimated annual fee APY in bps (updated by keeper)
    uint256 public currentAPY;

    constructor(
        address _asset,
        address _controller,
        address _router,
        address _lpPair,
        address _pairedToken
    ) BaseStrategy(_asset, _controller) {
        require(_router != address(0), "Invalid router");
        require(_lpPair != address(0), "Invalid LP pair");
        require(_pairedToken != address(0), "Invalid paired token");
        router = IWallFreeXRouter(_router);
        lpPair = IWallFreeXPair(_lpPair);
        pairedToken = IERC20(_pairedToken);
    }

    function name() external pure override returns (string memory) {
        return "WallFreeX Stablecoin LP";
    }

    function totalAssets() external view override returns (uint256) {
        uint256 lpBalance = lpPair.balanceOf(address(this));
        if (lpBalance == 0) return 0;

        uint256 totalLP = lpPair.totalSupply();
        (uint112 reserve0, uint112 reserve1,) = lpPair.getReserves();

        // Calculate our share of reserves
        address token0 = lpPair.token0();
        uint256 ourReserve;
        if (token0 == address(underlyingAsset)) {
            ourReserve = (uint256(reserve0) * lpBalance) / totalLP;
            // Add the paired token value (assuming ~1:1 for stablecoins)
            ourReserve += (uint256(reserve1) * lpBalance) / totalLP;
        } else {
            ourReserve = (uint256(reserve1) * lpBalance) / totalLP;
            ourReserve += (uint256(reserve0) * lpBalance) / totalLP;
        }
        return ourReserve;
    }

    function estimatedAPY() external view override returns (uint256) {
        return currentAPY;
    }

    function _deposit(uint256 amount) internal override {
        // Split deposit 50/50 between the two tokens
        uint256 halfAmount = amount / 2;
        uint256 otherHalf = amount - halfAmount;

        // Swap half to paired token via router
        address[] memory path = new address[](2);
        path[0] = address(underlyingAsset);
        path[1] = address(pairedToken);

        underlyingAsset.approve(address(router), halfAmount);
        // For stablecoin pairs, minimal slippage expected

        // Add liquidity
        uint256 minA = (otherHalf * (10000 - slippageBps)) / 10000;
        uint256 pairedBalance = pairedToken.balanceOf(address(this));

        underlyingAsset.approve(address(router), otherHalf);
        pairedToken.approve(address(router), pairedBalance);

        router.addLiquidity(
            address(underlyingAsset),
            address(pairedToken),
            otherHalf,
            pairedBalance,
            minA,
            0,
            address(this),
            block.timestamp + 300
        );
    }

    function _withdraw(uint256 amount) internal override returns (uint256) {
        uint256 lpBalance = lpPair.balanceOf(address(this));
        if (lpBalance == 0) return 0;

        // Calculate LP tokens to remove for desired amount
        uint256 totalVal = this.totalAssets();
        uint256 lpToRemove = (lpBalance * amount) / totalVal;
        if (lpToRemove > lpBalance) lpToRemove = lpBalance;

        uint256 before = underlyingAsset.balanceOf(address(this));

        lpPair.approve(address(router), lpToRemove);
        router.removeLiquidity(
            address(underlyingAsset),
            address(pairedToken),
            lpToRemove,
            0,
            0,
            address(this),
            block.timestamp + 300
        );

        // Swap received paired tokens back to underlying
        uint256 pairedBalance = pairedToken.balanceOf(address(this));
        if (pairedBalance > 0) {
            address[] memory path = new address[](2);
            path[0] = address(pairedToken);
            path[1] = address(underlyingAsset);
            pairedToken.approve(address(router), pairedBalance);
            // Swap would happen here via router
        }

        return underlyingAsset.balanceOf(address(this)) - before;
    }

    function _harvest() internal override returns (uint256) {
        // LP fees auto-compound into the pool reserves
        return 0;
    }

    function _emergencyWithdraw() internal override returns (uint256) {
        uint256 lpBalance = lpPair.balanceOf(address(this));
        if (lpBalance == 0) return 0;

        uint256 before = underlyingAsset.balanceOf(address(this));

        lpPair.approve(address(router), lpBalance);
        router.removeLiquidity(
            address(underlyingAsset),
            address(pairedToken),
            lpBalance,
            0,
            0,
            address(this),
            block.timestamp + 300
        );

        // Swap all paired tokens back
        uint256 pairedBalance = pairedToken.balanceOf(address(this));
        if (pairedBalance > 0) {
            pairedToken.approve(address(router), pairedBalance);
            // Swap would happen via router
        }

        return underlyingAsset.balanceOf(address(this)) - before;
    }

    /// @notice Update the APY estimate (called by keeper)
    function updateAPY(uint256 _apy) external {
        require(msg.sender == controller || msg.sender == owner(), "Unauthorized");
        currentAPY = _apy;
    }

    /// @notice Update slippage tolerance
    function setSlippageBps(uint256 _slippage) external onlyOwner {
        require(_slippage <= 500, "Slippage too high");
        slippageBps = _slippage;
    }
}
