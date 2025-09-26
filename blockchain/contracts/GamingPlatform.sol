// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./GameNFT.sol";

contract GamingPlatform is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    GameNFT public gameNFT;

    // State variables
    mapping(string => uint256) public gameMintCount; // gameId => number of mints for this game
    mapping(string => mapping(uint256 => uint256)) public mintApprovals; // gameId => mintId => approval count
    mapping(string => mapping(uint256 => mapping(address => bool))) public mintParticipants; // gameId => mintId => user => has participated
    mapping(string => mapping(uint256 => bool)) public mintCompleted; // gameId => mintId => whether minting was completed

    uint256 public constant REQUIRED_PARTICIPANTS = 10; // 10 users must participate

    // Events
    event UserParticipated(string indexed gameId, uint256 indexed mintId, address participant);
    event NFTMinted(address indexed recipient, uint256 tokenId, string gameId,
                    uint256 indexed mintId, string imageUrl);

    constructor(address _gameNFT) {
        gameNFT = GameNFT(_gameNFT);
    }

    /**
     * @dev Participate in minting for a specific game and mint attempt
     */
    function participateInMint(string memory _gameId, uint256 _mintId) external {
        require(!mintParticipants[_gameId][_mintId][msg.sender], "Already participated in this mint");

        mintParticipants[_gameId][_mintId][msg.sender] = true;
        mintApprovals[_gameId][_mintId]++;

        emit UserParticipated(_gameId, _mintId, msg.sender);
    }

    /**
     * @dev Get the next available mint ID for a game
     */
    function getNextMint(string memory _gameId) external view returns (uint256) {
        return gameMintCount[_gameId] + 1;
    }

    /**
     * @dev Get mint approval count for a specific game and mint ID
     */
    function getMintApprovals(string memory _gameId, uint256 _mintId) external view returns (
        uint256 approvalCount
    ) {
        return mintApprovals[_gameId][_mintId];
    }

    /**
     * @dev Check if a specific game and mint ID is ready to mint
     */
    function readyToMint(string memory _gameId, uint256 _mintId) external view returns (bool) {
        return mintApprovals[_gameId][_mintId] >= REQUIRED_PARTICIPANTS;
    }

    /**
     * @dev Mint NFTs for top users of a game (owner only, after 10+ participants for specific mint)
     */
    function mintNFTsForTopUsers(
        string memory _gameId,
        uint256 _mintId,
        address[] memory _topUsers,
        string[] memory _imageUrls,
        string[] memory _descriptions
    ) external onlyOwner nonReentrant {
        require(!mintCompleted[_gameId][_mintId], "Mint already completed");
        require(mintApprovals[_gameId][_mintId] >= REQUIRED_PARTICIPANTS, "Not enough participants");
        require(_topUsers.length == _imageUrls.length, "Users and images count mismatch");
        require(_topUsers.length == _descriptions.length, "Users and descriptions count mismatch");
        require(_topUsers.length <= 3, "Maximum 3 NFTs per game");

        for (uint256 i = 0; i < _topUsers.length; i++) {
            uint256 tokenId = gameNFT.mintNFT(
                _topUsers[i],
                _imageUrls[i],
                _descriptions[i]
            );

            emit NFTMinted(_topUsers[i], tokenId, _gameId, _mintId, _imageUrls[i]);
        }

        // Mark mint as completed and increment mint count
        mintCompleted[_gameId][_mintId] = true;
        gameMintCount[_gameId]++;
    }
}