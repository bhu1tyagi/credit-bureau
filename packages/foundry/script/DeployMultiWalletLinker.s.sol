// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./DeployHelpers.s.sol";
import "../contracts/MultiWalletLinker.sol";

contract DeployMultiWalletLinker is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        MultiWalletLinker linker = new MultiWalletLinker(deployer);
        console.log("MultiWalletLinker deployed at:", address(linker));
    }
}
