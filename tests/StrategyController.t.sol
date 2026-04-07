// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {StrategyController} from "../contracts/core/StrategyController.sol";
import {MockERC20} from "../contracts/mocks/MockERC20.sol";
import {MockStrategy} from "../contracts/mocks/MockStrategy.sol";

contract StrategyControllerTest is Test {
    StrategyController public controller;
    MockERC20 public usdt;
    MockStrategy public strategy1;
    MockStrategy public strategy2;
    MockStrategy public strategy3;

    address public owner = address(this);
    address public keeper = address(0xBEEF);
    address public vaultAddr = address(0xCA11);

    function setUp() public {
        vm.warp(1_000_000);
        usdt = new MockERC20("Tether USD", "USDT", 6);
        controller = new StrategyController(address(usdt), keeper);
        controller.setVault(vaultAddr);

        strategy1 = new MockStrategy(address(usdt), "dForce Lending", 500);
        strategy2 = new MockStrategy(address(usdt), "SHUI Staking", 700);
        strategy3 = new MockStrategy(address(usdt), "WallFreeX LP", 800);

        controller.addStrategy(address(strategy1));
        controller.addStrategy(address(strategy2));
    }

    // --- Strategy Management ---

    function test_addStrategy() public {
        controller.addStrategy(address(strategy3));
        assertEq(controller.strategyCount(), 3);
        assertTrue(controller.isRegistered(address(strategy3)));
    }

    function test_addStrategy_duplicate_reverts() public {
        vm.expectRevert("Already registered");
        controller.addStrategy(address(strategy1));
    }

    function test_removeStrategy() public {
        controller.removeStrategy(address(strategy2));
        assertEq(controller.strategyCount(), 1);
        assertFalse(controller.isRegistered(address(strategy2)));
    }

    // --- Rebalance ---

    function test_rebalance() public {
        // Fund the controller
        usdt.mint(address(controller), 10_000e6);

        uint256[] memory weights = new uint256[](2);
        weights[0] = 6000;
        weights[1] = 4000;

        vm.prank(keeper);
        controller.rebalance(weights);

        uint256[] memory currentWeights = controller.getWeights();
        assertEq(currentWeights[0], 6000);
        assertEq(currentWeights[1], 4000);
    }

    function test_rebalance_notKeeper_reverts() public {
        uint256[] memory weights = new uint256[](2);
        weights[0] = 5000;
        weights[1] = 5000;

        vm.prank(address(0x999));
        vm.expectRevert("Only keeper");
        controller.rebalance(weights);
    }

    function test_rebalance_invalidWeights_reverts() public {
        uint256[] memory weights = new uint256[](2);
        weights[0] = 5000;
        weights[1] = 3000; // Sum = 8000, not 10000

        vm.prank(keeper);
        vm.expectRevert("Weights must sum to 10000");
        controller.rebalance(weights);
    }

    function test_rebalance_cooldown() public {
        usdt.mint(address(controller), 10_000e6);

        uint256[] memory weights = new uint256[](2);
        weights[0] = 5000;
        weights[1] = 5000;

        vm.prank(keeper);
        controller.rebalance(weights);

        // Second rebalance immediately should fail
        vm.prank(keeper);
        vm.expectRevert("Cooldown not elapsed");
        controller.rebalance(weights);

        // After cooldown, should succeed
        vm.warp(block.timestamp + 6 minutes);
        vm.prank(keeper);
        controller.rebalance(weights);
    }

    // --- Allocation ---

    function test_allocate() public {
        // Set initial weights
        usdt.mint(address(controller), 1_000e6);
        uint256[] memory weights = new uint256[](2);
        weights[0] = 7000;
        weights[1] = 3000;
        vm.prank(keeper);
        controller.rebalance(weights);

        // Allocate more
        usdt.mint(address(controller), 5_000e6);
        vm.prank(vaultAddr);
        controller.allocate(5_000e6);

        assertGt(controller.totalStrategyAssets(), 0, "Should have assets in strategies");
    }

    function test_deallocate() public {
        // Set weights first
        uint256[] memory weights = new uint256[](2);
        weights[0] = 5000;
        weights[1] = 5000;
        vm.prank(keeper);
        controller.rebalance(weights);

        // Allocate funds to strategies
        usdt.mint(address(controller), 10_000e6);
        vm.prank(vaultAddr);
        controller.allocate(10_000e6);

        assertGt(controller.totalStrategyAssets(), 0, "Should have assets before deallocate");

        vm.prank(vaultAddr);
        uint256 withdrawn = controller.deallocate(3_000e6);
        assertGt(withdrawn, 0, "Should withdraw some assets");
    }

    // --- Emergency ---

    function test_emergencyWithdrawAll() public {
        usdt.mint(address(controller), 10_000e6);
        uint256[] memory weights = new uint256[](2);
        weights[0] = 5000;
        weights[1] = 5000;
        vm.prank(keeper);
        controller.rebalance(weights);

        controller.emergencyWithdrawAll();

        assertTrue(controller.emergencyMode());
        assertEq(controller.totalStrategyAssets(), 0, "All assets should be withdrawn");
    }

    function test_emergencyMode_blocksRebalance() public {
        controller.emergencyWithdrawAll();

        uint256[] memory weights = new uint256[](2);
        weights[0] = 5000;
        weights[1] = 5000;

        vm.prank(keeper);
        vm.expectRevert("Emergency mode active");
        controller.rebalance(weights);
    }

    // --- Keeper Management ---

    function test_setKeeper() public {
        address newKeeper = address(0xBEEF2);
        controller.setKeeper(newKeeper);
        assertEq(controller.keeper(), newKeeper);
    }

    function test_setKeeper_notOwner_reverts() public {
        vm.prank(address(0x999));
        vm.expectRevert();
        controller.setKeeper(address(0xBEEF2));
    }

    // --- View Functions ---

    function test_getStrategyAPYs() public view {
        uint256[] memory apys = controller.getStrategyAPYs();
        assertEq(apys.length, 2);
        assertEq(apys[0], 500);
        assertEq(apys[1], 700);
    }

    function test_getStrategies() public view {
        address[] memory strats = controller.getStrategies();
        assertEq(strats.length, 2);
        assertEq(strats[0], address(strategy1));
        assertEq(strats[1], address(strategy2));
    }
}
