const { ethers } = require('ethers');

// Validate required environment variables
function validateEnvironment() {
  const requiredVars = [
    'RPC_URL',
    'LOCAL_PRIVATE_KEY',
    'GAMING_PLATFORM_ADDRESS',
    'NFT_CONTRACT_ADDRESS'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

// ERC721 ABI for minting function
const ERC721_ABI = [
  "function mint(address to, string memory tokenURI) public returns (uint256)",
  "function safeMint(address to, string memory tokenURI) public returns (uint256)",
  "function ownerOf(uint256 tokenId) public view returns (address)",
  "function tokenURI(uint256 tokenId) public view returns (string memory)"
];

// GamingPlatform contract ABI
const GAMING_PLATFORM_ABI = [
  "function getNextMint(string) external view returns (uint256)",
  "function participateInMint(string, uint256) external",
  "function readyToMint(string, uint256) external view returns (bool)",
  "function mintNFTsForTopUsers(string, uint256, address[], string[], string[]) external",
  "function getMintApprovals(string, uint256) external view returns (uint256)",
  "event UserParticipated(string indexed, uint256 indexed, address)",
  "event NFTMinted(address indexed, uint256, string indexed, uint256 indexed)"
];

function getProvider() {
  validateEnvironment();
  const url = process.env.RPC_URL;
  return new ethers.JsonRpcProvider(url);
}

function getWallet() {
  validateEnvironment();
  const pk = process.env.LOCAL_PRIVATE_KEY;
  return new ethers.Wallet(pk, getProvider());
}

function getGamingPlatformContract() {
  validateEnvironment();
  const contractAddress = process.env.GAMING_PLATFORM_ADDRESS;
  const wallet = getWallet();
  return new ethers.Contract(contractAddress, GAMING_PLATFORM_ABI, wallet);
}

function getContract() {
  validateEnvironment();
  const contractAddress = process.env.NFT_CONTRACT_ADDRESS;
  const wallet = getWallet();
  return new ethers.Contract(contractAddress, ERC721_ABI, wallet);
}

async function getNextMint(gameId) {
  try {
    validateEnvironment();
    const contract = getGamingPlatformContract();
    const mintId = await contract.getNextMint(gameId);
    return mintId;
  } catch (error) {
    console.error('Error getting next mint ID:', error);
    throw new Error(`Failed to get next mint ID: ${error.message}`);
  }
}

async function participateInMint(gameId, mintId) {
  try {
    validateEnvironment();
    const contract = getGamingPlatformContract();
    const tx = await contract.participateInMint(gameId, mintId);
    const receipt = await tx.wait();
    return { txHash: receipt.hash, gameId, mintId };
  } catch (error) {
    // Check if this is a business logic error from the contract
    if (error.reason && error.reason.includes('Already participated')) {
      // This is expected - user already participated
      console.log(`Already participated in mint ${mintId} for game ${gameId}`);
      return { txHash: null, gameId, mintId, alreadyParticipated: true };
    }

    // Check for other contract revert reasons
    if (error.reason) {
      throw new Error(`Contract error: ${error.reason}`);
    }

    // For other technical errors, re-throw
    console.error('Error participating in mint:', error);
    throw new Error(`Failed to participate in mint: ${error.message}`);
  }
}

async function readyToMint(gameId, mintId) {
  try {
    validateEnvironment();
    const contract = getGamingPlatformContract();
    const isReady = await contract.readyToMint(gameId, mintId);
    return isReady;
  } catch (error) {
    console.error('Error checking if ready to mint:', error);
    throw new Error(`Failed to check ready to mint: ${error.message}`);
  }
}

let FormDataNode = null;
try {
  // form-data package accepts Buffer directly (older Node compat)
  FormDataNode = require('form-data');
} catch (e) {
  FormDataNode = null;
}

async function mintNFTsForTopUsers(gameId, mintId, topUsers, imageUrls, descriptions) {
  try {
    validateEnvironment();

    const contract = getGamingPlatformContract();
    const tx = await contract.mintNFTsForTopUsers(gameId, mintId, topUsers, imageUrls, descriptions);
    const receipt = await tx.wait();
    
    // Parse NFTMinted events
    const nftMintedEvents = [];
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed.name === 'NFTMinted') {
          nftMintedEvents.push({
            recipient: parsed.args.recipient,
            tokenId: parsed.args.tokenId.toString(),
            gameId: parsed.args.gameId.toString(),
            mintId: parsed.args.mintId.toString()
          });
        }
      } catch {
        // Not a GamingPlatform event, skip
      }
    }
    
    return { 
      txHash: receipt.hash, 
      gameId, 
      mintId,
      blockNumber: receipt.blockNumber,
      imageUrls,
      nftMintedEvents
    };
  } catch (error) {
    console.error('Error minting NFTs for top users:', error);
    throw new Error(`Failed to mint NFTs for top users: ${error.message}`);
  }
}

async function mintToken(to, amount) {
  // stub: in real implementation, connect to ERC20 contract and call mint
  return { txHash: '0xstubtokenmint', to, amount };
}

async function mintNFT(to, metadataUrl) {
  try {
    validateEnvironment();
    const contract = getContract();
    
    // Try safeMint first, fallback to mint if not available
    let tx;
    try {
      tx = await contract.safeMint(to, metadataUrl);
    } catch (error) {
      if (error.message.includes('safeMint')) {
        tx = await contract.mint(to, metadataUrl);
      } else {
        throw error;
      }
    }
    
    // Wait for transaction confirmation
    const receipt = await tx.wait();
    
    // Try to get tokenId from events (this depends on the contract implementation)
    let tokenId = null;
    if (receipt.logs && receipt.logs.length > 0) {
      // Parse Transfer event to get tokenId
      const transferEvent = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === 'Transfer';
        } catch {
          return false;
        }
      });
      
      if (transferEvent) {
        const parsed = contract.interface.parseLog(transferEvent);
        tokenId = parsed.args.tokenId.toString();
      }
    }
    
    return { 
      txHash: receipt.hash, 
      to, 
      metadataUrl,
      tokenId,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    console.error('Error minting NFT:', error);
    throw new Error(`Failed to mint NFT: ${error.message}`);
  }
}

module.exports = { 
  getProvider, 
  getWallet, 
  getContract, 
  getGamingPlatformContract,
  getNextMint,
  participateInMint,
  readyToMint,
  mintNFTsForTopUsers,
  mintToken, 
  mintNFT 
};
