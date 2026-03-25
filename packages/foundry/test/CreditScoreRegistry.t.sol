// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/CreditScoreRegistry.sol";

contract CreditScoreRegistryTest is Test {
    CreditScoreRegistry public registry;

    address owner = address(this);
    address attester = vm.addr(2);
    address user = vm.addr(3);
    address unauthorized = vm.addr(4);

    bytes32 constant SCORE_HASH_1 = keccak256("score-data-1");
    bytes32 constant SCORE_HASH_2 = keccak256("score-data-2");

    function setUp() public {
        registry = new CreditScoreRegistry(owner);
        registry.addAttester(attester);
    }

    // --- Register & Read ---

    function test_RegisterScore_AsOwner() public {
        uint256 ts = block.timestamp;
        registry.registerScore(user, SCORE_HASH_1, ts);

        (bytes32 hash, uint256 timestamp) = registry.getScore(user);
        assertEq(hash, SCORE_HASH_1);
        assertEq(timestamp, ts);
    }

    function test_RegisterScore_AsAttester() public {
        uint256 ts = block.timestamp;
        vm.prank(attester);
        registry.registerScore(user, SCORE_HASH_1, ts);

        (bytes32 hash, uint256 timestamp) = registry.getScore(user);
        assertEq(hash, SCORE_HASH_1);
        assertEq(timestamp, ts);
    }

    function test_RegisterScore_EmitsEvent() public {
        uint256 ts = block.timestamp;
        vm.expectEmit(true, false, false, true);
        emit CreditScoreRegistry.ScoreUpdated(user, SCORE_HASH_1, ts);
        registry.registerScore(user, SCORE_HASH_1, ts);
    }

    function test_RevertWhen_UnauthorizedRegisters() public {
        vm.prank(unauthorized);
        vm.expectRevert(CreditScoreRegistry.NotAuthorized.selector);
        registry.registerScore(user, SCORE_HASH_1, block.timestamp);
    }

    function test_RevertWhen_ZeroScoreHash() public {
        vm.expectRevert(CreditScoreRegistry.InvalidScoreHash.selector);
        registry.registerScore(user, bytes32(0), block.timestamp);
    }

    function test_RevertWhen_ZeroTimestamp() public {
        vm.expectRevert(CreditScoreRegistry.InvalidTimestamp.selector);
        registry.registerScore(user, SCORE_HASH_1, 0);
    }

    // --- History ---

    function test_ScoreHistory() public {
        uint256 ts1 = 1000;
        uint256 ts2 = 2000;

        registry.registerScore(user, SCORE_HASH_1, ts1);
        registry.registerScore(user, SCORE_HASH_2, ts2);

        CreditScoreRegistry.ScoreRecord[] memory history = registry.getScoreHistory(user);
        assertEq(history.length, 2);
        assertEq(history[0].scoreHash, SCORE_HASH_1);
        assertEq(history[0].timestamp, ts1);
        assertEq(history[1].scoreHash, SCORE_HASH_2);
        assertEq(history[1].timestamp, ts2);

        // Latest should be the second one
        (bytes32 hash, uint256 timestamp) = registry.getScore(user);
        assertEq(hash, SCORE_HASH_2);
        assertEq(timestamp, ts2);
    }

    // --- TTL ---

    function test_ScoreValid_WithinTTL() public {
        vm.warp(1000);
        registry.registerScore(user, SCORE_HASH_1, block.timestamp);

        // Still within 30 days
        vm.warp(1000 + 15 days);
        assertTrue(registry.isScoreValid(user));
    }

    function test_ScoreInvalid_AfterTTL() public {
        vm.warp(1000);
        registry.registerScore(user, SCORE_HASH_1, block.timestamp);

        // Past 30 days
        vm.warp(1000 + 31 days);
        assertFalse(registry.isScoreValid(user));
    }

    function test_ScoreInvalid_NoScore() public {
        assertFalse(registry.isScoreValid(user));
    }

    function test_SetScoreTTL() public {
        registry.setScoreTTL(7 days);
        assertEq(registry.scoreTTL(), 7 days);

        // Now a score should expire after 7 days
        vm.warp(1000);
        registry.registerScore(user, SCORE_HASH_1, block.timestamp);

        vm.warp(1000 + 8 days);
        assertFalse(registry.isScoreValid(user));
    }

    function test_RevertWhen_NonOwnerSetsTTL() public {
        vm.prank(attester);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attester));
        registry.setScoreTTL(7 days);
    }

    // --- Access Control ---

    function test_AddAndRemoveAttester() public {
        address newAttester = vm.addr(5);

        registry.addAttester(newAttester);
        assertTrue(registry.authorizedAttesters(newAttester));

        registry.removeAttester(newAttester);
        assertFalse(registry.authorizedAttesters(newAttester));
    }

    function test_RevertWhen_NonOwnerAddsAttester() public {
        vm.prank(attester);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attester));
        registry.addAttester(vm.addr(5));
    }

    function test_RemovedAttesterCannotRegister() public {
        registry.removeAttester(attester);

        vm.prank(attester);
        vm.expectRevert(CreditScoreRegistry.NotAuthorized.selector);
        registry.registerScore(user, SCORE_HASH_1, block.timestamp);
    }
}
