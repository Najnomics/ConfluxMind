// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {StrategyController} from "../contracts/core/StrategyController.sol";
import {ConfluxMindVault} from "../contracts/core/ConfluxMindVault.sol";
import {GasSponsorManager} from "../contracts/core/GasSponsorManager.sol";
import {DForceUnitusAdapter} from "../contracts/strategies/DForceUnitusAdapter.sol";
import {SHUIFinanceAdapter} from "../contracts/strategies/SHUIFinanceAdapter.sol";
import {WallFreeXAdapter} from "../contracts/strategies/WallFreeXAdapter.sol";

/// @title Deploy - Foundry deployment script for ConfluxMind on Conflux eSpace
/// @notice Deploys all core contracts, strategy adapters, and wires them together
contract Deploy is Script {
    // Deployed contract addresses
    StrategyController public strategyController;
    ConfluxMindVault public vault;
    GasSponsorManager public gasSponsorManager;
    DForceUnitusAdapter public dforceAdapter;
    SHUIFinanceAdapter public shuiAdapter;
    WallFreeXAdapter public wallfreeXAdapter;

    function run() external {
        // ── Read deployer key ──────────────────────────────────────────
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // ── Read protocol addresses from env ───────────────────────────
        address usdt = vm.envAddress("USDT0_ADDRESS");
        address wcfx = vm.envAddress("WCFX_ADDRESS");
        address axcnh = vm.envAddress("AXCNH_ADDRESS");
        address dforceIToken = vm.envAddress("DFORCE_UNITUS_ITOKEN");
        address shuiStaking = vm.envAddress("SHUI_FINANCE_STAKING");
        address shuiSFX = vm.envAddress("SHUI_FINANCE_SFX");
        address wallfreeXRouter = vm.envAddress("WALLFREEX_ROUTER");
        address wallfreeXLPPair = vm.envAddress("WALLFREEX_LP_PAIR");
        address keeperAddress = vm.envAddress("KEEPER_ADDRESS");
        uint256 sponsorFundAmount = vm.envUint("SPONSOR_FUND_AMOUNT_CFX") * 1 ether;

        console.log("Deployer:", deployer);
        console.log("USDT:", usdt);

        vm.startBroadcast(deployerPrivateKey);

        // ── 1. Deploy StrategyController ───────────────────────────────
        strategyController = new StrategyController(usdt, keeperAddress);
        console.log("StrategyController deployed at:", address(strategyController));

        // ── 2. Deploy ConfluxMindVault ─────────────────────────────────
        vault = new ConfluxMindVault(
            IERC20(usdt),
            "ConfluxMind Yield Token",
            "cmUSDT",
            address(strategyController),
            deployer // feeRecipient = deployer initially
        );
        console.log("ConfluxMindVault deployed at:", address(vault));

        // ── 3. Deploy GasSponsorManager ────────────────────────────────
        gasSponsorManager = new GasSponsorManager();
        console.log("GasSponsorManager deployed at:", address(gasSponsorManager));

        // ── 4. Deploy Strategy Adapters ────────────────────────────────

        // 4a. dForce Unitus Adapter (USDT lending)
        dforceAdapter = new DForceUnitusAdapter(usdt, address(strategyController), dforceIToken);
        console.log("DForceUnitusAdapter deployed at:", address(dforceAdapter));

        // 4b. SHUI Finance Adapter (CFX liquid staking)
        shuiAdapter = new SHUIFinanceAdapter(wcfx, address(strategyController), shuiStaking, shuiSFX);
        console.log("SHUIFinanceAdapter deployed at:", address(shuiAdapter));

        // 4c. WallFreeX Adapter (AxCNH/USDT0 LP)
        wallfreeXAdapter = new WallFreeXAdapter(
            usdt,
            address(strategyController),
            wallfreeXRouter,
            wallfreeXLPPair,
            axcnh
        );
        console.log("WallFreeXAdapter deployed at:", address(wallfreeXAdapter));

        // ── 5. Wire up contracts ───────────────────────────────────────

        // Set vault on StrategyController
        strategyController.setVault(address(vault));
        console.log("StrategyController.setVault done");

        // Register strategies
        strategyController.addStrategy(address(dforceAdapter));
        strategyController.addStrategy(address(shuiAdapter));
        strategyController.addStrategy(address(wallfreeXAdapter));
        console.log("Strategies registered on StrategyController");

        // ── 6. Sponsor gas for vault and controller ────────────────────
        if (sponsorFundAmount > 0 && address(deployer).balance >= sponsorFundAmount) {
            uint256 perContract = sponsorFundAmount / 3;
            uint256 gasUpperBound = 1_000_000; // 1M gas per tx

            gasSponsorManager.sponsorContract{value: perContract}(address(vault), gasUpperBound);
            console.log("Vault sponsored with CFX:", perContract);

            gasSponsorManager.sponsorContract{value: perContract}(address(strategyController), gasUpperBound);
            console.log("StrategyController sponsored with CFX:", perContract);

            gasSponsorManager.sponsorContract{value: perContract}(address(gasSponsorManager), gasUpperBound);
            console.log("GasSponsorManager sponsored with CFX:", perContract);
        } else {
            console.log("Skipping gas sponsorship (insufficient balance or zero amount)");
        }

        vm.stopBroadcast();

        // ── Log summary ────────────────────────────────────────────────
        console.log("");
        console.log("=== ConfluxMind Deployment Summary ===");
        console.log("StrategyController:", address(strategyController));
        console.log("ConfluxMindVault:  ", address(vault));
        console.log("GasSponsorManager: ", address(gasSponsorManager));
        console.log("DForceAdapter:     ", address(dforceAdapter));
        console.log("SHUIAdapter:       ", address(shuiAdapter));
        console.log("WallFreeXAdapter:  ", address(wallfreeXAdapter));
        console.log("======================================");
    }
}
