// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ISponsorWhitelistControl} from "../interfaces/ISponsorWhitelistControl.sol";

/// @title GasSponsorManager - Manages Conflux Fee Sponsorship for gasless UX
/// @notice Uses Conflux's SponsorWhitelistControl built-in contract to sponsor all user-facing transactions
/// @dev Deployed on Conflux eSpace; sponsors gas for deposit, withdraw, and claimYield calls
contract GasSponsorManager is Ownable {
    /// @notice Conflux built-in SponsorWhitelistControl at fixed address
    ISponsorWhitelistControl public constant SPONSOR_CONTROL =
        ISponsorWhitelistControl(0x0888000000000000000000000000000000000001);

    /// @notice Contracts that are sponsored by this manager
    address[] public sponsoredContracts;

    /// @notice Tracks which contracts are in the sponsored list
    mapping(address => bool) public isSponsored;

    event ContractSponsored(address indexed contractAddr, uint256 gasFund, uint256 collateralFund);
    event SponsorFunded(address indexed contractAddr, uint256 amount);
    event ContractRemoved(address indexed contractAddr);

    constructor() Ownable(msg.sender) {}

    /// @notice Sponsor a contract for gas and collateral, whitelisting all users
    /// @param contractAddr The contract to sponsor
    /// @param gasUpperBound Maximum gas fee per transaction to sponsor
    function sponsorContract(address contractAddr, uint256 gasUpperBound) external payable onlyOwner {
        require(contractAddr != address(0), "Invalid contract address");
        require(msg.value > 0, "Must fund sponsor");

        uint256 gasFund = msg.value / 2;
        uint256 collateralFund = msg.value - gasFund;

        // Set gas sponsorship
        SPONSOR_CONTROL.setSponsorForGas{value: gasFund}(contractAddr, gasUpperBound);

        // Set collateral sponsorship
        SPONSOR_CONTROL.setSponsorForCollateral{value: collateralFund}(contractAddr);

        // Whitelist all users (address(0) = all users)
        address[] memory allUsers = new address[](1);
        allUsers[0] = address(0);
        SPONSOR_CONTROL.addPrivilegeByAdmin(contractAddr, allUsers);

        if (!isSponsored[contractAddr]) {
            sponsoredContracts.push(contractAddr);
            isSponsored[contractAddr] = true;
        }

        emit ContractSponsored(contractAddr, gasFund, collateralFund);
    }

    /// @notice Add more gas sponsorship funds to an already sponsored contract
    /// @param contractAddr The contract to fund
    function fundGasSponsor(address contractAddr) external payable onlyOwner {
        require(isSponsored[contractAddr], "Contract not sponsored");
        require(msg.value > 0, "Must send CFX");

        SPONSOR_CONTROL.setSponsorForGas{value: msg.value}(contractAddr, 0);

        emit SponsorFunded(contractAddr, msg.value);
    }

    /// @notice Get the remaining gas sponsor balance for a contract
    function getSponsorBalance(address contractAddr) external view returns (uint256) {
        return SPONSOR_CONTROL.getSponsoredBalanceForGas(contractAddr);
    }

    /// @notice Get all sponsored contracts
    function getSponsoredContracts() external view returns (address[] memory) {
        return sponsoredContracts;
    }

    /// @notice Check if a user is whitelisted for a sponsored contract
    function isUserWhitelisted(address contractAddr, address user) external view returns (bool) {
        return SPONSOR_CONTROL.isWhitelisted(contractAddr, user);
    }

    /// @notice Allow the contract to receive CFX for funding
    receive() external payable {}
}
