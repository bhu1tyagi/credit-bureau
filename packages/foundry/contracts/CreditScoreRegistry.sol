// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CreditScoreRegistry
 * @notice Stores the latest credit score hash per wallet for on-chain verification.
 *         Maintains both the latest record and full history per address.
 */
contract CreditScoreRegistry is Ownable {
    struct ScoreRecord {
        bytes32 scoreHash;
        uint256 timestamp;
    }

    /// @notice Default TTL for score validity (30 days)
    uint256 public scoreTTL = 30 days;

    /// @notice Authorized attesters who can register scores
    mapping(address => bool) public authorizedAttesters;

    /// @notice Latest score record per wallet
    mapping(address => ScoreRecord) private _latestScores;

    /// @notice Full score history per wallet
    mapping(address => ScoreRecord[]) private _scoreHistory;

    event ScoreUpdated(address indexed wallet, bytes32 scoreHash, uint256 timestamp);
    event AttesterAdded(address indexed attester);
    event AttesterRemoved(address indexed attester);
    event ScoreTTLUpdated(uint256 newTTL);

    error NotAuthorized();
    error InvalidScoreHash();
    error InvalidTimestamp();

    modifier onlyAuthorized() {
        if (msg.sender != owner() && !authorizedAttesters[msg.sender]) {
            revert NotAuthorized();
        }
        _;
    }

    constructor(address _owner) Ownable(_owner) {}

    /**
     * @notice Register a credit score hash for a user
     * @param user The wallet address to register the score for
     * @param scoreHash The keccak256 hash of the credit score data
     * @param timestamp The timestamp when the score was computed
     */
    function registerScore(address user, bytes32 scoreHash, uint256 timestamp) external onlyAuthorized {
        if (scoreHash == bytes32(0)) revert InvalidScoreHash();
        if (timestamp == 0) revert InvalidTimestamp();

        ScoreRecord memory record = ScoreRecord({ scoreHash: scoreHash, timestamp: timestamp });

        _latestScores[user] = record;
        _scoreHistory[user].push(record);

        emit ScoreUpdated(user, scoreHash, timestamp);
    }

    /**
     * @notice Get the latest score for a wallet
     * @param user The wallet address to query
     * @return scoreHash The latest score hash
     * @return timestamp The timestamp of the latest score
     */
    function getScore(address user) external view returns (bytes32 scoreHash, uint256 timestamp) {
        ScoreRecord memory record = _latestScores[user];
        return (record.scoreHash, record.timestamp);
    }

    /**
     * @notice Check if a score is still valid (within TTL)
     * @param user The wallet address to check
     * @return valid Whether the score is within its TTL
     */
    function isScoreValid(address user) external view returns (bool valid) {
        ScoreRecord memory record = _latestScores[user];
        if (record.timestamp == 0) return false;
        return (block.timestamp - record.timestamp) <= scoreTTL;
    }

    /**
     * @notice Get the full score history for a wallet
     * @param user The wallet address to query
     * @return The array of all ScoreRecords
     */
    function getScoreHistory(address user) external view returns (ScoreRecord[] memory) {
        return _scoreHistory[user];
    }

    /**
     * @notice Add an authorized attester
     * @param attester The address to authorize
     */
    function addAttester(address attester) external onlyOwner {
        authorizedAttesters[attester] = true;
        emit AttesterAdded(attester);
    }

    /**
     * @notice Remove an authorized attester
     * @param attester The address to deauthorize
     */
    function removeAttester(address attester) external onlyOwner {
        authorizedAttesters[attester] = false;
        emit AttesterRemoved(attester);
    }

    /**
     * @notice Update the score TTL
     * @param newTTL The new TTL in seconds
     */
    function setScoreTTL(uint256 newTTL) external onlyOwner {
        scoreTTL = newTTL;
        emit ScoreTTLUpdated(newTTL);
    }
}
