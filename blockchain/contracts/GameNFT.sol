// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GameNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;

    struct GameToken {
        uint256 id;
        address creator;
        string imageUrl;
        string metadata;
        uint256 createdAt;
    }

    mapping(uint256 => GameToken) public gameTokens;
    mapping(address => uint256[]) public userTokens;

    // Events
    event NFTMinted(uint256 indexed tokenId, address indexed recipient, string imageUrl);
    event TokenTransferred(uint256 indexed tokenId, address indexed from, address indexed to);

    constructor() ERC721("GameNFT", "GNFT") {}

    /**
     * @dev Mint a new NFT
     */
    function mintNFT(
        address _recipient,
        string memory _imageUrl,
        string memory _metadata
    ) external onlyOwner returns (uint256) {
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;

        _mint(_recipient, tokenId);
        _setTokenURI(tokenId, _imageUrl);

        gameTokens[tokenId] = GameToken({
            id: tokenId,
            creator: _recipient,
            imageUrl: _imageUrl,
            metadata: _metadata,
            createdAt: block.timestamp
        });

        userTokens[_recipient].push(tokenId);

        // Note: Mint completion is handled by GamingPlatform.mintNFTsForTopUsers()

        emit NFTMinted(tokenId, _recipient, _imageUrl);
        return tokenId;
    }

    /**
     * @dev Get token metadata
     */
    function getTokenMetadata(uint256 _tokenId) external view returns (GameToken memory) {
        // Use public `ownerOf` which reverts for non-existent tokens in OZ v5
        ownerOf(_tokenId);
        return gameTokens[_tokenId];
    }

    /**
     * @dev Get all tokens owned by a user
     */
    function getUserTokens(address _user) external view returns (uint256[] memory) {
        return userTokens[_user];
    }

    /**
     * @dev Get total supply of tokens
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @dev Override required by Solidity
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    /**
     * @dev Override required by Solidity
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Override _burn to handle tokenURI
     */
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    /**
     * @dev Override _transfer to emit custom event
     */
    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {
        super._transfer(from, to, tokenId);

        // Update user tokens mapping
        _removeTokenFromUser(from, tokenId);
        userTokens[to].push(tokenId);

        emit TokenTransferred(tokenId, from, to);
    }

    /**
     * @dev Helper function to remove token from user's array
     */
    function _removeTokenFromUser(address _user, uint256 _tokenId) private {
        uint256[] storage userTokenList = userTokens[_user];
        for (uint256 i = 0; i < userTokenList.length; i++) {
            if (userTokenList[i] == _tokenId) {
                userTokenList[i] = userTokenList[userTokenList.length - 1];
                userTokenList.pop();
                break;
            }
        }
    }
}