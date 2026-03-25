// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title MultiWalletLinker
 * @notice On-chain registry for linking multiple wallets to a primary wallet.
 *         Uses ECDSA signature verification to prove ownership of the linked wallet.
 */
contract MultiWalletLinker is Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    /// @notice Maps a linked wallet back to its primary wallet
    mapping(address => address) public primaryOf;

    /// @notice Maps a primary wallet to its list of linked wallets
    mapping(address => address[]) private _linkedWallets;

    /// @notice Quick lookup: is this address linked as a secondary to some primary?
    mapping(address => bool) public isLinked;

    /// @notice Nonces for replay protection
    mapping(address => uint256) public nonces;

    event WalletsLinked(address indexed primary, address indexed secondary);
    event WalletUnlinked(address indexed primary, address indexed secondary);

    error AlreadyLinked(address wallet);
    error NotLinked(address wallet);
    error InvalidSignature();
    error CannotLinkSelf();
    error WalletIsPrimary(address wallet);

    constructor(address _owner) Ownable(_owner) {}

    /**
     * @notice Link a wallet to a primary wallet. The linked wallet must sign
     *         a message proving it agrees to be linked.
     * @param primary The primary wallet address
     * @param linked The wallet to link (must have signed the message)
     * @param signature ECDSA signature from the `linked` wallet over the link message
     */
    function linkWallet(address primary, address linked, bytes calldata signature) external {
        if (primary == linked) revert CannotLinkSelf();
        if (isLinked[linked]) revert AlreadyLinked(linked);
        // Don't allow linking a wallet that is already a primary with linked wallets
        if (_linkedWallets[linked].length > 0) revert WalletIsPrimary(linked);

        // Verify signature: linked wallet must sign keccak256(primary, linked, nonce, chainId, contractAddress)
        uint256 nonce = nonces[linked];
        bytes32 messageHash = keccak256(
            abi.encodePacked(primary, linked, nonce, block.chainid, address(this))
        );
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedHash.recover(signature);

        if (signer != linked) revert InvalidSignature();

        // Update state
        nonces[linked] = nonce + 1;
        primaryOf[linked] = primary;
        isLinked[linked] = true;
        _linkedWallets[primary].push(linked);

        emit WalletsLinked(primary, linked);
    }

    /**
     * @notice Unlink a wallet. Can be called by the primary wallet owner
     *         or the linked wallet itself.
     * @param wallet The secondary wallet to unlink
     */
    function unlinkWallet(address wallet) external {
        if (!isLinked[wallet]) revert NotLinked(wallet);

        address primary = primaryOf[wallet];

        // Only the primary wallet owner or the linked wallet can unlink
        if (msg.sender != primary && msg.sender != wallet) {
            revert NotLinked(wallet); // Reuse error for unauthorized
        }

        // Remove from linked wallets array
        address[] storage wallets = _linkedWallets[primary];
        for (uint256 i = 0; i < wallets.length; i++) {
            if (wallets[i] == wallet) {
                wallets[i] = wallets[wallets.length - 1];
                wallets.pop();
                break;
            }
        }

        // Clean up mappings
        delete primaryOf[wallet];
        isLinked[wallet] = false;

        emit WalletUnlinked(primary, wallet);
    }

    /**
     * @notice Get all wallets linked to a primary address
     * @param primary The primary wallet to query
     * @return Array of linked wallet addresses
     */
    function getLinkedWallets(address primary) external view returns (address[] memory) {
        return _linkedWallets[primary];
    }

    /**
     * @notice Get the current nonce for a wallet (useful for signing)
     * @param wallet The wallet to query
     * @return The current nonce
     */
    function getNonce(address wallet) external view returns (uint256) {
        return nonces[wallet];
    }
}
