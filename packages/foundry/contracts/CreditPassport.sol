// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CreditScoreRegistry.sol";

/**
 * @title CreditPassport
 * @notice Soulbound (non-transferable) ERC-721 credit passport.
 *         One passport per address. Dynamic tokenURI for metadata.
 * @dev Implements ERC-721 interface inline to avoid pragma version conflicts
 *      with OpenZeppelin's ERC721 (which requires ^0.8.24). Keeps things simple.
 */
contract CreditPassport is Ownable {
    // --- ERC-721 Events ---
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    // --- Custom Events ---
    event MetadataUpdated(uint256 indexed tokenId, string uri);

    // --- Errors ---
    error SoulboundTransferBlocked();
    error AlreadyHasPassport(address wallet);
    error PassportDoesNotExist(uint256 tokenId);
    error NotAuthorized();
    error ZeroAddress();
    error TokenDoesNotExist();

    // --- State ---
    string public name = "CredBureau Passport";
    string public symbol = "CRED";

    CreditScoreRegistry public immutable registry;

    uint256 private _nextTokenId;

    /// @notice Authorized attesters who can update metadata
    mapping(address => bool) public authorizedAttesters;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => string) private _tokenURIs;

    /// @notice Mapping from wallet to its passport token ID (0 means none)
    mapping(address => uint256) public passportOf;
    /// @notice Track whether an address has a passport (since tokenId 0 is never minted)
    mapping(address => bool) public hasPassport;

    modifier onlyAuthorized() {
        if (msg.sender != owner() && !authorizedAttesters[msg.sender]) {
            revert NotAuthorized();
        }
        _;
    }

    constructor(address _owner, address _registry) Ownable(_owner) {
        registry = CreditScoreRegistry(_registry);
        _nextTokenId = 1; // Start token IDs at 1
    }

    // ========== ERC-721 Core (Read-Only) ==========

    function balanceOf(address wallet) external view returns (uint256) {
        if (wallet == address(0)) revert ZeroAddress();
        return _balances[wallet];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address tokenOwner = _owners[tokenId];
        if (tokenOwner == address(0)) revert TokenDoesNotExist();
        return tokenOwner;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        if (_owners[tokenId] == address(0)) revert TokenDoesNotExist();
        return _tokenURIs[tokenId];
    }

    // ========== ERC-721 Transfer Blocks (Soulbound) ==========

    function approve(address, uint256) external pure {
        revert SoulboundTransferBlocked();
    }

    function getApproved(uint256) external pure returns (address) {
        return address(0);
    }

    function setApprovalForAll(address, bool) external pure {
        revert SoulboundTransferBlocked();
    }

    function isApprovedForAll(address, address) external pure returns (bool) {
        return false;
    }

    function transferFrom(address, address, uint256) external pure {
        revert SoulboundTransferBlocked();
    }

    function safeTransferFrom(address, address, uint256) external pure {
        revert SoulboundTransferBlocked();
    }

    function safeTransferFrom(address, address, uint256, bytes calldata) external pure {
        revert SoulboundTransferBlocked();
    }

    // ========== ERC-165 ==========

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x80ac58cd // ERC721
            || interfaceId == 0x5b5e139f // ERC721Metadata
            || interfaceId == 0x01ffc9a7; // ERC165
    }

    // ========== Passport Operations ==========

    /**
     * @notice Mint a new credit passport to a wallet
     * @param to The wallet to receive the passport
     * @param uri The initial metadata URI
     */
    function mint(address to, string calldata uri) external onlyAuthorized returns (uint256) {
        if (to == address(0)) revert ZeroAddress();
        if (hasPassport[to]) revert AlreadyHasPassport(to);

        uint256 tokenId = _nextTokenId++;

        _owners[tokenId] = to;
        _balances[to] = 1;
        _tokenURIs[tokenId] = uri;
        passportOf[to] = tokenId;
        hasPassport[to] = true;

        emit Transfer(address(0), to, tokenId);

        return tokenId;
    }

    /**
     * @notice Burn a credit passport
     * @param tokenId The token ID to burn
     */
    function burn(uint256 tokenId) external onlyAuthorized {
        address tokenOwner = _owners[tokenId];
        if (tokenOwner == address(0)) revert PassportDoesNotExist(tokenId);

        delete _owners[tokenId];
        delete _tokenURIs[tokenId];
        _balances[tokenOwner] = 0;
        hasPassport[tokenOwner] = false;
        passportOf[tokenOwner] = 0;

        emit Transfer(tokenOwner, address(0), tokenId);
    }

    /**
     * @notice Update the metadata URI for a passport
     * @param tokenId The token ID to update
     * @param uri The new metadata URI
     */
    function updateMetadata(uint256 tokenId, string calldata uri) external onlyAuthorized {
        if (_owners[tokenId] == address(0)) revert PassportDoesNotExist(tokenId);
        _tokenURIs[tokenId] = uri;
        emit MetadataUpdated(tokenId, uri);
    }

    /**
     * @notice Add an authorized attester
     * @param attester The address to authorize
     */
    function addAttester(address attester) external onlyOwner {
        authorizedAttesters[attester] = true;
    }

    /**
     * @notice Remove an authorized attester
     * @param attester The address to deauthorize
     */
    function removeAttester(address attester) external onlyOwner {
        authorizedAttesters[attester] = false;
    }
}
