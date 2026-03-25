// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/MultiWalletLinker.sol";

contract MultiWalletLinkerTest is Test {
    MultiWalletLinker public linker;

    address owner = address(this);

    // Use actual private keys so we can sign
    uint256 primaryKey = 0xA11CE;
    uint256 linkedKey = 0xB0B;
    uint256 thirdKey = 0xCA1;

    address primary;
    address linked;
    address third;

    function setUp() public {
        primary = vm.addr(primaryKey);
        linked = vm.addr(linkedKey);
        third = vm.addr(thirdKey);

        linker = new MultiWalletLinker(owner);
    }

    function _signLinkMessage(address _primary, address _linked, uint256 _signerKey) internal view returns (bytes memory) {
        uint256 nonce = linker.getNonce(_linked);
        bytes32 messageHash = keccak256(
            abi.encodePacked(_primary, _linked, nonce, block.chainid, address(linker))
        );
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(_signerKey, ethSignedHash);
        return abi.encodePacked(r, s, v);
    }

    // --- Link ---

    function test_LinkWallet() public {
        bytes memory sig = _signLinkMessage(primary, linked, linkedKey);
        linker.linkWallet(primary, linked, sig);

        assertTrue(linker.isLinked(linked));
        assertEq(linker.primaryOf(linked), primary);

        address[] memory wallets = linker.getLinkedWallets(primary);
        assertEq(wallets.length, 1);
        assertEq(wallets[0], linked);
    }

    function test_LinkMultipleWallets() public {
        bytes memory sig1 = _signLinkMessage(primary, linked, linkedKey);
        linker.linkWallet(primary, linked, sig1);

        bytes memory sig2 = _signLinkMessage(primary, third, thirdKey);
        linker.linkWallet(primary, third, sig2);

        address[] memory wallets = linker.getLinkedWallets(primary);
        assertEq(wallets.length, 2);
        assertEq(wallets[0], linked);
        assertEq(wallets[1], third);
    }

    function test_LinkWallet_EmitsEvent() public {
        bytes memory sig = _signLinkMessage(primary, linked, linkedKey);

        vm.expectEmit(true, true, false, true);
        emit MultiWalletLinker.WalletsLinked(primary, linked);
        linker.linkWallet(primary, linked, sig);
    }

    function test_RevertWhen_LinkSelf() public {
        bytes memory sig = _signLinkMessage(primary, primary, primaryKey);
        vm.expectRevert(MultiWalletLinker.CannotLinkSelf.selector);
        linker.linkWallet(primary, primary, sig);
    }

    function test_RevertWhen_LinkAlreadyLinked() public {
        bytes memory sig = _signLinkMessage(primary, linked, linkedKey);
        linker.linkWallet(primary, linked, sig);

        // Try to link again
        bytes memory sig2 = _signLinkMessage(primary, linked, linkedKey);
        vm.expectRevert(abi.encodeWithSelector(MultiWalletLinker.AlreadyLinked.selector, linked));
        linker.linkWallet(primary, linked, sig2);
    }

    function test_RevertWhen_InvalidSignature() public {
        // Sign with wrong key (primary's key instead of linked's key)
        bytes memory badSig = _signLinkMessage(primary, linked, primaryKey);
        vm.expectRevert(MultiWalletLinker.InvalidSignature.selector);
        linker.linkWallet(primary, linked, badSig);
    }

    function test_RevertWhen_LinkWalletThatIsPrimary() public {
        // First link `linked` to `primary`
        bytes memory sig = _signLinkMessage(primary, linked, linkedKey);
        linker.linkWallet(primary, linked, sig);

        // Now try to link `third` to `primary`, then try to make `primary` a secondary
        bytes memory sig2 = _signLinkMessage(linked, primary, primaryKey);
        // primary has linked wallets, so it cannot become a secondary
        vm.expectRevert(abi.encodeWithSelector(MultiWalletLinker.WalletIsPrimary.selector, primary));
        linker.linkWallet(linked, primary, sig2);
    }

    // --- Unlink ---

    function test_UnlinkWallet_ByPrimary() public {
        bytes memory sig = _signLinkMessage(primary, linked, linkedKey);
        linker.linkWallet(primary, linked, sig);

        vm.prank(primary);
        linker.unlinkWallet(linked);

        assertFalse(linker.isLinked(linked));
        assertEq(linker.primaryOf(linked), address(0));

        address[] memory wallets = linker.getLinkedWallets(primary);
        assertEq(wallets.length, 0);
    }

    function test_UnlinkWallet_BySelf() public {
        bytes memory sig = _signLinkMessage(primary, linked, linkedKey);
        linker.linkWallet(primary, linked, sig);

        vm.prank(linked);
        linker.unlinkWallet(linked);

        assertFalse(linker.isLinked(linked));
    }

    function test_UnlinkWallet_EmitsEvent() public {
        bytes memory sig = _signLinkMessage(primary, linked, linkedKey);
        linker.linkWallet(primary, linked, sig);

        vm.expectEmit(true, true, false, true);
        emit MultiWalletLinker.WalletUnlinked(primary, linked);
        vm.prank(primary);
        linker.unlinkWallet(linked);
    }

    function test_RevertWhen_UnlinkNotLinked() public {
        vm.expectRevert(abi.encodeWithSelector(MultiWalletLinker.NotLinked.selector, linked));
        linker.unlinkWallet(linked);
    }

    function test_RevertWhen_UnauthorizedUnlink() public {
        bytes memory sig = _signLinkMessage(primary, linked, linkedKey);
        linker.linkWallet(primary, linked, sig);

        // Third party tries to unlink
        vm.prank(third);
        vm.expectRevert(abi.encodeWithSelector(MultiWalletLinker.NotLinked.selector, linked));
        linker.unlinkWallet(linked);
    }

    // --- Nonce ---

    function test_NonceIncrementsAfterLink() public {
        assertEq(linker.getNonce(linked), 0);

        bytes memory sig = _signLinkMessage(primary, linked, linkedKey);
        linker.linkWallet(primary, linked, sig);

        assertEq(linker.getNonce(linked), 1);
    }

    // --- GetLinkedWallets ---

    function test_GetLinkedWallets_Empty() public view {
        address[] memory wallets = linker.getLinkedWallets(primary);
        assertEq(wallets.length, 0);
    }

    function test_UnlinkMiddleWallet_PreservesOthers() public {
        bytes memory sig1 = _signLinkMessage(primary, linked, linkedKey);
        linker.linkWallet(primary, linked, sig1);

        bytes memory sig2 = _signLinkMessage(primary, third, thirdKey);
        linker.linkWallet(primary, third, sig2);

        // Unlink the first one
        vm.prank(primary);
        linker.unlinkWallet(linked);

        address[] memory wallets = linker.getLinkedWallets(primary);
        assertEq(wallets.length, 1);
        assertEq(wallets[0], third);
    }
}
