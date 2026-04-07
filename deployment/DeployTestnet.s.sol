// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {StrategyController} from "../contracts/core/StrategyController.sol";
import {ConfluxMindVault} from "../contracts/core/ConfluxMindVault.sol";
import {GasSponsorManager} from "../contracts/core/GasSponsorManager.sol";
import {MockERC20} from "../contracts/mocks/MockERC20.sol";
import {MockStrategy} from "../contracts/mocks/MockStrategy.sol";

/// @title DeployTestnet - Testnet deployment script for ConfluxMind
/// @notice Deploys mock tokens, mock strategies, and the full system for testing
contract DeployTestnet is Script {
    // Mock tokens
    MockERC20 public mockUSDT;
    MockERC20 public mockAxCNH;
    MockERC20 public mockWCFX;

    // Core contracts
    StrategyController public strategyController;
    ConfluxMindVault public vault;
    GasSponsorManager public gasSponsorManager;

    // Mock strategies
    MockStrategy public mockDForceStrategy;
    MockStrategy public mockSHUIStrategy;
    MockStrategy public mockWallFreeXStrategy;

    // Initial mint amounts
    uint256 constant USDT_MINT = 1_000_000 * 1e6;   // 1M USDT (6 decimals)
    uint256 constant AXCNH_MINT = 1_000_000 * 1e18;  // 1M AxCNH (18 decimals)
    uint256 constant WCFX_MINT = 1_000_000 * 1e18;   // 1M WCFX (18 decimals)

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deployer:", deployer);
        console.log("Deployer balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // ── 1. Deploy Mock Tokens ──────────────────────────────────────
        mockUSDT = new MockERC20("Mock USDT", "USDT", 6);
        console.log("MockUSDT deployed at:", address(mockUSDT));

        mockAxCNH = new MockERC20("Mock AxCNH", "AxCNH", 18);
        console.log("MockAxCNH deployed at:", address(mockAxCNH));

        mockWCFX = new MockERC20("Mock WCFX", "WCFX", 18);
        console.log("MockWCFX deployed at:", address(mockWCFX));

        // ── 2. Mint test tokens to deployer ────────────────────────────
        mockUSDT.mint(deployer, USDT_MINT);
        mockAxCNH.mint(deployer, AXCNH_MINT);
        mockWCFX.mint(deployer, WCFX_MINT);
        console.log("Minted test tokens to deployer");

        // ── 3. Deploy StrategyController ───────────────────────────────
        strategyController = new StrategyController(address(mockUSDT), deployer);
        console.log("StrategyController deployed at:", address(strategyController));

        // ── 4. Deploy ConfluxMindVault ─────────────────────────────────
        vault = new ConfluxMindVault(
            IERC20(address(mockUSDT)),
            "ConfluxMind Yield Token",
            "cmUSDT",
            address(strategyController),
            deployer
        );
        console.log("ConfluxMindVault deployed at:", address(vault));

        // ── 5. Deploy GasSponsorManager ────────────────────────────────
        gasSponsorManager = new GasSponsorManager();
        console.log("GasSponsorManager deployed at:", address(gasSponsorManager));

        // ── 6. Deploy Mock Strategies ──────────────────────────────────
        mockDForceStrategy = new MockStrategy(
            address(mockUSDT),
            "Mock dForce Unitus Lending",
            800 // 8% APY in bps
        );
        console.log("MockDForceStrategy deployed at:", address(mockDForceStrategy));

        mockSHUIStrategy = new MockStrategy(
            address(mockUSDT),
            "Mock SHUI Finance Staking",
            500 // 5% APY in bps
        );
        console.log("MockSHUIStrategy deployed at:", address(mockSHUIStrategy));

        mockWallFreeXStrategy = new MockStrategy(
            address(mockUSDT),
            "Mock WallFreeX LP",
            1200 // 12% APY in bps
        );
        console.log("MockWallFreeXStrategy deployed at:", address(mockWallFreeXStrategy));

        // ── 7. Wire up contracts ───────────────────────────────────────

        // Set vault on controller
        strategyController.setVault(address(vault));
        console.log("StrategyController.setVault done");

        // Register mock strategies
        strategyController.addStrategy(address(mockDForceStrategy));
        strategyController.addStrategy(address(mockSHUIStrategy));
        strategyController.addStrategy(address(mockWallFreeXStrategy));
        console.log("Mock strategies registered");

        // ── 8. Fund deployer with additional test tokens ───────────────
        // Mint extra tokens for testing deposits
        mockUSDT.mint(deployer, 100_000 * 1e6); // Extra 100k USDT for testing
        console.log("Extra test tokens minted");

        // ── 9. Approve vault to spend deployer's USDT ──────────────────
        mockUSDT.approve(address(vault), type(uint256).max);
        console.log("Vault approved for USDT spending");

        vm.stopBroadcast();

        // ── Log summary ────────────────────────────────────────────────
        console.log("");
        console.log("=== ConfluxMind Testnet Deployment Summary ===");
        console.log("--- Mock Tokens ---");
        console.log("MockUSDT:          ", address(mockUSDT));
        console.log("MockAxCNH:         ", address(mockAxCNH));
        console.log("MockWCFX:          ", address(mockWCFX));
        console.log("--- Core Contracts ---");
        console.log("StrategyController:", address(strategyController));
        console.log("ConfluxMindVault:  ", address(vault));
        console.log("GasSponsorManager: ", address(gasSponsorManager));
        console.log("--- Mock Strategies ---");
        console.log("MockDForce:        ", address(mockDForceStrategy));
        console.log("MockSHUI:          ", address(mockSHUIStrategy));
        console.log("MockWallFreeX:     ", address(mockWallFreeXStrategy));
        console.log("==============================================");
    }
}
