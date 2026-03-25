//SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./DeployHelpers.s.sol";
import { CreditScoreRegistry } from "../contracts/CreditScoreRegistry.sol";
import { CreditPassport } from "../contracts/CreditPassport.sol";
import { MultiWalletLinker } from "../contracts/MultiWalletLinker.sol";

/**
 * @notice Main deployment script for all CredBureau contracts
 * @dev Run this when you want to deploy all contracts at once
 *
 * Example: yarn deploy # runs this script (without `--file` flag)
 */
contract DeployScript is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        // 1. Deploy CreditScoreRegistry
        CreditScoreRegistry registry = new CreditScoreRegistry(deployer);
        console.log("CreditScoreRegistry deployed at:", address(registry));

        // 2. Deploy CreditPassport (linked to registry)
        CreditPassport passport = new CreditPassport(deployer, address(registry));
        console.log("CreditPassport deployed at:", address(passport));

        // 3. Deploy MultiWalletLinker
        MultiWalletLinker linker = new MultiWalletLinker(deployer);
        console.log("MultiWalletLinker deployed at:", address(linker));
    }
}
