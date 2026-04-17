// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {Factory} from "../src/Factory.sol";
import {HelperConfig} from "./HelperConfig.s.sol";

contract DeployFactory is Script {
    function run() public {
        deployFactory();
    }

    function deployFactory() public returns (Factory, HelperConfig) {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.getConfig();

        vm.startBroadcast();
        Factory factory = new Factory(config.creationFee);
        vm.stopBroadcast();

        return (factory, helperConfig);
    }
}
