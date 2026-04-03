// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./DeployHelpers.s.sol";
import { CreditScoreRegistry } from "../contracts/CreditScoreRegistry.sol";
import { CreditPassport } from "../contracts/CreditPassport.sol";
import { MultiWalletLinker } from "../contracts/MultiWalletLinker.sol";

/**
 * @notice Mainnet deployment script for all CredBureau contracts
 * @dev Deploys to Base, Arbitrum, or Optimism mainnet.
 *      Uses a separate ATTESTER_ADDRESS for the hot-wallet that signs attestations.
 *
 * Usage:
 *   forge script script/DeployMainnet.s.sol --rpc-url base --broadcast --verify
 *   forge script script/DeployMainnet.s.sol --rpc-url arbitrum --broadcast --verify
 *   forge script script/DeployMainnet.s.sol --rpc-url optimism --broadcast --verify
 */
contract DeployMainnet is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        address attesterAddress = vm.envOr("ATTESTER_ADDRESS", deployer);

        CreditScoreRegistry registry = new CreditScoreRegistry(deployer);
        deployments.push(Deployment("CreditScoreRegistry", address(registry)));
        console.log("CreditScoreRegistry deployed at:", address(registry));

        CreditPassport passport = new CreditPassport(deployer, address(registry));
        deployments.push(Deployment("CreditPassport", address(passport)));
        console.log("CreditPassport deployed at:", address(passport));

        MultiWalletLinker linker = new MultiWalletLinker(deployer);
        deployments.push(Deployment("MultiWalletLinker", address(linker)));
        console.log("MultiWalletLinker deployed at:", address(linker));

        if (attesterAddress != deployer) {
            registry.addAttester(attesterAddress);
            passport.addAttester(attesterAddress);
            console.log("Attester role granted to:", attesterAddress);
        }

        console.log("--- Deployment Summary ---");
        console.log("Chain ID:", block.chainid);
        console.log("Deployer:", deployer);
        console.log("Attester:", attesterAddress);
    }
}
