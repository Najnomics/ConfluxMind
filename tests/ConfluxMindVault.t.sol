// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {ConfluxMindVault} from "../contracts/core/ConfluxMindVault.sol";
import {StrategyController} from "../contracts/core/StrategyController.sol";
import {MockERC20} from "../contracts/mocks/MockERC20.sol";
import {MockStrategy} from "../contracts/mocks/MockStrategy.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ConfluxMindVaultTest is Test {
    ConfluxMindVault public vault;
    StrategyController public controller;
    MockERC20 public usdt;
    MockStrategy public strategy1;
    MockStrategy public strategy2;

    address public owner = address(this);
    address public keeper = address(0xBEEF);
    address public feeRecipient = address(0xFEE);
    address public user1 = address(0x1);
    address public user2 = address(0x2);

    uint256 constant INITIAL_BALANCE = 100_000e6; // 100k USDT (6 decimals)

    function setUp() public {
        // Start at a realistic timestamp
        vm.warp(1_000_000);

        // Deploy mock USDT
        usdt = new MockERC20("Tether USD", "USDT", 6);

        // Deploy strategy controller
        controller = new StrategyController(address(usdt), keeper);

        // Deploy vault
        vault = new ConfluxMindVault(
            IERC20(address(usdt)),
            "ConfluxMind Yield Token",
            "cmUSDT",
            address(controller),
            feeRecipient
        );

        // Wire up controller to vault
        controller.setVault(address(vault));

        // Deploy mock strategies
        strategy1 = new MockStrategy(address(usdt), "dForce Lending", 500); // 5% APY
        strategy2 = new MockStrategy(address(usdt), "WallFreeX LP", 800); // 8% APY

        // Register strategies
        controller.addStrategy(address(strategy1));
        controller.addStrategy(address(strategy2));

        // Set weights: 60% strategy1, 40% strategy2
        uint256[] memory weights = new uint256[](2);
        weights[0] = 6000;
        weights[1] = 4000;
        vm.prank(keeper);
        controller.rebalance(weights);

        // Fund users
        usdt.mint(user1, INITIAL_BALANCE);
        usdt.mint(user2, INITIAL_BALANCE);

        // Approve vault
        vm.prank(user1);
        usdt.approve(address(vault), type(uint256).max);
        vm.prank(user2);
        usdt.approve(address(vault), type(uint256).max);
    }

    // --- Deposit Tests ---

    function test_deposit() public {
        uint256 depositAmount = 10_000e6;

        vm.prank(user1);
        uint256 shares = vault.deposit(depositAmount, user1);

        assertGt(shares, 0, "Should receive shares");
        assertEq(vault.balanceOf(user1), shares, "User should hold shares");
    }

    function test_deposit_belowMinimum_reverts() public {
        vm.prank(user1);
        vm.expectRevert("Below minimum deposit");
        vault.deposit(100, user1); // 100 wei, below 1e6 min
    }

    function test_deposit_whenPaused_reverts() public {
        vault.pause();
        vm.prank(user1);
        vm.expectRevert("Vault is paused");
        vault.deposit(10_000e6, user1);
    }

    function test_deposit_deploysToStrategies() public {
        uint256 depositAmount = 10_000e6;

        vm.prank(user1);
        vault.deposit(depositAmount, user1);

        // Assets should be deployed to strategies via controller
        uint256 totalInStrategies = controller.totalStrategyAssets();
        assertGt(totalInStrategies, 0, "Assets should be in strategies");
    }

    // --- Withdraw Tests ---

    function test_withdraw() public {
        uint256 depositAmount = 10_000e6;

        vm.prank(user1);
        vault.deposit(depositAmount, user1);

        uint256 sharesBefore = vault.balanceOf(user1);

        vm.prank(user1);
        vault.withdraw(5_000e6, user1, user1);

        assertLt(vault.balanceOf(user1), sharesBefore, "Shares should decrease");
        assertGt(usdt.balanceOf(user1), INITIAL_BALANCE - depositAmount, "Should receive USDT back");
    }

    function test_withdraw_whenPaused_allowed() public {
        uint256 depositAmount = 10_000e6;

        vm.prank(user1);
        vault.deposit(depositAmount, user1);

        vault.pause();

        // Withdrawals should still work when paused
        vm.prank(user1);
        vault.withdraw(5_000e6, user1, user1);
    }

    // --- Redeem Tests ---

    function test_redeem() public {
        uint256 depositAmount = 10_000e6;

        vm.prank(user1);
        uint256 shares = vault.deposit(depositAmount, user1);

        vm.prank(user1);
        uint256 assets = vault.redeem(shares / 2, user1, user1);

        assertGt(assets, 0, "Should receive assets");
    }

    // --- Multi-user Tests ---

    function test_multipleDepositors() public {
        vm.prank(user1);
        vault.deposit(10_000e6, user1);

        vm.prank(user2);
        vault.deposit(20_000e6, user2);

        // User2 should have roughly 2x shares of user1
        uint256 shares1 = vault.balanceOf(user1);
        uint256 shares2 = vault.balanceOf(user2);
        assertApproxEqRel(shares2, shares1 * 2, 0.01e18, "User2 should have ~2x shares");
    }

    // --- ERC-4626 Compliance ---

    function test_previewDeposit() public view {
        uint256 shares = vault.previewDeposit(10_000e6);
        assertGt(shares, 0, "Should preview non-zero shares");
    }

    function test_previewRedeem() public {
        vm.prank(user1);
        uint256 shares = vault.deposit(10_000e6, user1);

        uint256 assets = vault.previewRedeem(shares);
        assertGt(assets, 0, "Should preview non-zero assets");
    }

    function test_totalAssets() public {
        vm.prank(user1);
        vault.deposit(10_000e6, user1);

        uint256 total = vault.totalAssets();
        assertGt(total, 0, "Total assets should be > 0");
    }

    // --- Admin Tests ---

    function test_setProtocolFee() public {
        vault.setProtocolFeeBps(500); // 5%
        assertEq(vault.protocolFeeBps(), 500);
    }

    function test_setProtocolFee_tooHigh_reverts() public {
        vm.expectRevert("Fee too high");
        vault.setProtocolFeeBps(2001); // >20%
    }

    function test_setFeeRecipient() public {
        address newRecipient = address(0xDEAD);
        vault.setFeeRecipient(newRecipient);
        assertEq(vault.feeRecipient(), newRecipient);
    }

    function test_pause_unpause() public {
        vault.pause();
        assertTrue(vault.paused());

        vault.unpause();
        assertFalse(vault.paused());
    }

    function test_onlyOwner_canPause() public {
        vm.prank(user1);
        vm.expectRevert();
        vault.pause();
    }
}
