// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ISponsorWhitelistControl - Conflux built-in contract for Fee Sponsorship
/// @notice Located at 0x0888000000000000000000000000000000000001 on Conflux eSpace
interface ISponsorWhitelistControl {
    function getSponsorForGas(address contractAddr) external view returns (address);
    function getSponsoredBalanceForGas(address contractAddr) external view returns (uint256);
    function getSponsoredGasFeeUpperBound(address contractAddr) external view returns (uint256);
    function getSponsorForCollateral(address contractAddr) external view returns (address);
    function getSponsoredBalanceForCollateral(address contractAddr) external view returns (uint256);
    function isWhitelisted(address contractAddr, address user) external view returns (bool);
    function isAllWhitelisted(address contractAddr) external view returns (bool);

    function setSponsorForGas(address contractAddr, uint256 upperBound) external payable;
    function setSponsorForCollateral(address contractAddr) external payable;
    function addPrivilegeByAdmin(address contractAddr, address[] calldata addresses) external;
    function removePrivilegeByAdmin(address contractAddr, address[] calldata addresses) external;
}
