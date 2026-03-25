// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/CreditPassport.sol";
import "../contracts/CreditScoreRegistry.sol";

contract CreditPassportTest is Test {
    CreditScoreRegistry public registry;
    CreditPassport public passport;

    address owner = address(this);
    address attester = vm.addr(2);
    address userA = vm.addr(3);
    address userB = vm.addr(4);
    address unauthorized = vm.addr(5);

    function setUp() public {
        registry = new CreditScoreRegistry(owner);
        passport = new CreditPassport(owner, address(registry));
        passport.addAttester(attester);
    }

    // --- Minting ---

    function test_Mint() public {
        uint256 tokenId = passport.mint(userA, "ipfs://metadata-a");

        assertEq(tokenId, 1);
        assertEq(passport.ownerOf(tokenId), userA);
        assertEq(passport.tokenURI(tokenId), "ipfs://metadata-a");
        assertTrue(passport.hasPassport(userA));
        assertEq(passport.passportOf(userA), tokenId);
    }

    function test_Mint_AsAttester() public {
        vm.prank(attester);
        uint256 tokenId = passport.mint(userA, "ipfs://metadata-a");
        assertEq(tokenId, 1);
        assertEq(passport.ownerOf(tokenId), userA);
    }

    function test_Mint_IncrementsTokenId() public {
        uint256 id1 = passport.mint(userA, "ipfs://a");
        uint256 id2 = passport.mint(userB, "ipfs://b");
        assertEq(id1, 1);
        assertEq(id2, 2);
    }

    function test_RevertWhen_MintDuplicate() public {
        passport.mint(userA, "ipfs://a");
        vm.expectRevert(abi.encodeWithSelector(CreditPassport.AlreadyHasPassport.selector, userA));
        passport.mint(userA, "ipfs://a2");
    }

    function test_RevertWhen_MintToZeroAddress() public {
        vm.expectRevert(CreditPassport.ZeroAddress.selector);
        passport.mint(address(0), "ipfs://a");
    }

    function test_RevertWhen_UnauthorizedMints() public {
        vm.prank(unauthorized);
        vm.expectRevert(CreditPassport.NotAuthorized.selector);
        passport.mint(userA, "ipfs://a");
    }

    // --- Soulbound (Transfer Blocked) ---

    function test_RevertWhen_TransferFrom() public {
        passport.mint(userA, "ipfs://a");
        vm.prank(userA);
        vm.expectRevert(CreditPassport.SoulboundTransferBlocked.selector);
        passport.transferFrom(userA, userB, 1);
    }

    function test_RevertWhen_SafeTransferFrom() public {
        passport.mint(userA, "ipfs://a");
        vm.prank(userA);
        vm.expectRevert(CreditPassport.SoulboundTransferBlocked.selector);
        passport.safeTransferFrom(userA, userB, 1);
    }

    function test_RevertWhen_SafeTransferFromWithData() public {
        passport.mint(userA, "ipfs://a");
        vm.prank(userA);
        vm.expectRevert(CreditPassport.SoulboundTransferBlocked.selector);
        passport.safeTransferFrom(userA, userB, 1, "");
    }

    function test_RevertWhen_Approve() public {
        passport.mint(userA, "ipfs://a");
        vm.prank(userA);
        vm.expectRevert(CreditPassport.SoulboundTransferBlocked.selector);
        passport.approve(userB, 1);
    }

    function test_RevertWhen_SetApprovalForAll() public {
        vm.prank(userA);
        vm.expectRevert(CreditPassport.SoulboundTransferBlocked.selector);
        passport.setApprovalForAll(userB, true);
    }

    // --- Metadata Update ---

    function test_UpdateMetadata() public {
        uint256 tokenId = passport.mint(userA, "ipfs://old");
        passport.updateMetadata(tokenId, "ipfs://new");
        assertEq(passport.tokenURI(tokenId), "ipfs://new");
    }

    function test_UpdateMetadata_AsAttester() public {
        uint256 tokenId = passport.mint(userA, "ipfs://old");
        vm.prank(attester);
        passport.updateMetadata(tokenId, "ipfs://new");
        assertEq(passport.tokenURI(tokenId), "ipfs://new");
    }

    function test_RevertWhen_UnauthorizedUpdatesMetadata() public {
        uint256 tokenId = passport.mint(userA, "ipfs://old");
        vm.prank(unauthorized);
        vm.expectRevert(CreditPassport.NotAuthorized.selector);
        passport.updateMetadata(tokenId, "ipfs://new");
    }

    function test_RevertWhen_UpdateNonexistentToken() public {
        vm.expectRevert(abi.encodeWithSelector(CreditPassport.PassportDoesNotExist.selector, 999));
        passport.updateMetadata(999, "ipfs://new");
    }

    // --- Burn ---

    function test_Burn() public {
        uint256 tokenId = passport.mint(userA, "ipfs://a");
        passport.burn(tokenId);

        assertFalse(passport.hasPassport(userA));
        assertEq(passport.passportOf(userA), 0);

        vm.expectRevert(CreditPassport.TokenDoesNotExist.selector);
        passport.ownerOf(tokenId);
    }

    function test_MintAfterBurn() public {
        uint256 id1 = passport.mint(userA, "ipfs://a");
        passport.burn(id1);

        // Should be able to mint again
        uint256 id2 = passport.mint(userA, "ipfs://a2");
        assertEq(id2, 2); // New token ID
        assertTrue(passport.hasPassport(userA));
    }

    // --- ERC-165 ---

    function test_SupportsInterface() public view {
        assertTrue(passport.supportsInterface(0x80ac58cd)); // ERC721
        assertTrue(passport.supportsInterface(0x5b5e139f)); // ERC721Metadata
        assertTrue(passport.supportsInterface(0x01ffc9a7)); // ERC165
        assertFalse(passport.supportsInterface(0xdeadbeef)); // Random
    }

    // --- Registry Integration ---

    function test_RegistryAddress() public view {
        assertEq(address(passport.registry()), address(registry));
    }
}
