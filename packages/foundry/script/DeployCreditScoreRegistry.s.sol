// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DeployHelpers.s.sol";
import "../contracts/CreditScoreRegistry.sol";

contract DeployCreditScoreRegistry is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        CreditScoreRegistry registry = new CreditScoreRegistry(deployer);
        console.log("CreditScoreRegistry deployed at:", address(registry));
    }
}
