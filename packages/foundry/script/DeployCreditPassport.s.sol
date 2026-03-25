// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DeployHelpers.s.sol";
import "../contracts/CreditPassport.sol";

contract DeployCreditPassport is ScaffoldETHDeploy {
    /// @notice Pass the registry address after deploying CreditScoreRegistry
    function run(address registryAddr) external ScaffoldEthDeployerRunner {
        CreditPassport passport = new CreditPassport(deployer, registryAddr);
        console.log("CreditPassport deployed at:", address(passport));
    }
}
