const fs = require('fs');
const { generatePromptsFromGame, generateImageFromPrompt, downloadImage } = require('../utils/ai');
const { getNextMint, readyToMint, mintNFTsForTopUsers } = require('../utils/web3');
const { uploadLocalFileToIPFS } = require('../utils/ipfs_upload');

const isMinting = {};  // gameId -> boolean

const TOP_USERS_LIMIT = 1;

module.exports = async function (fastify, opts) {
  // Mint NFT: get next mint ID, generate prompts and image, participate in mint, then mint NFTs to active users
  fastify.post('/mint-nft', async (req, reply) => {
    const { gameId } = req.body || {};

    if (!gameId) {
      return reply.status(400).send({ error: 'gameId is required' });
    }
    if (isMinting[gameId]) {
      return reply.status(429).send({ error: 'Minting already in progress for this game' });
    }

    try {
      // Get game data from database
      const game = fastify.db.getGameById(gameId);
      if (!game) {
        return reply.status(404).send({ error: 'Game not found' });
      }

      // Step: Get active users (limit to 3 for NFT minting)
      const activeUsers = fastify.db.getActiveUsers(TOP_USERS_LIMIT); // Get top active users
      console.log(`Found ${activeUsers.length} active users for NFT minting`);
      if (activeUsers.length === 0) {
        return reply.status(400).send({ error: 'No active users found for NFT minting' });
      }

      // Step: Get the next mint ID for this game
      const mintId = await getNextMint(gameId);
      console.log(`Next mint ID for game ${gameId}: ${mintId}`);
      // Check DB for existing mint with same mintId
      const existingMints = await fastify.db.getMintsByGame(gameId);
      if (existingMints?.some(m => String(m.mintId) === String(mintId))) {
        return reply.status(400).send({ error: 'NFT already minted for this mint ID' });
      }

      // Step: Count votes for this mint
      const isReadyToMint = await readyToMint(gameId, mintId);
      console.log(`readyToMint for mint ${mintId}: ${isReadyToMint}`);
      if (!isReadyToMint) {
        return reply.status(400).send({ error: 'Not enough participants to mint NFT' });
      }

      isMinting[gameId] = true;

      const imageUrls = [];
      // Step: Generate 3 prompts
      // If enough images already exist, avoid generating new ones
      const max_filename = `./public/nfts/mint_${gameId}_${mintId}-${TOP_USERS_LIMIT}.png`;
      let prompts = [];
      if (fs.existsSync(max_filename)) {
        console.log(`Using existing images for mint ${mintId}`);
        for (let i = 0; i < TOP_USERS_LIMIT; i++)
          prompts.push(`Existing image for ${game.name} #${i + 1}`);
      } else {
        prompts = await generatePromptsFromGame(game, TOP_USERS_LIMIT);
        console.log(`Generated ${prompts.length} prompts for NFT minting`);
        if (prompts.length > TOP_USERS_LIMIT)
          prompts.length = TOP_USERS_LIMIT;
      }

      for (let i = 0; i < prompts.length; i++) {
        const localImagePath = `./public/nfts/mint_${gameId}_${mintId}-${i + 1}.png`;
        if (fs.existsSync(localImagePath)) {
          console.log(`Using existing image at: ${localImagePath}`);
          const ipfsUrl = await uploadLocalFileToIPFS(localImagePath);
          console.log(`Uploaded to IPFS: ${ipfsUrl}`);
          imageUrls.push(ipfsUrl);
          continue;
        }

        console.log(`Prompt ${i + 1}: ${prompts[i]}`);
        const imageUrl = await generateImageFromPrompt(prompts[i]);
        console.log(`Generated image: ${imageUrl}`);
        
        const imagePath = await downloadImage(imageUrl, localImagePath);
        console.log(`Downloaded image to: ${imagePath}`);
        
        const ipfsUrl = await uploadLocalFileToIPFS(imagePath)
        imageUrls.push(ipfsUrl);
      }

      // Step: Prepare data for minting
      const topUsers = activeUsers.slice(0, TOP_USERS_LIMIT).map(user => user.address).filter(addr => addr);
      const descriptions = topUsers.map((_, index) => 
        `${game.name} - AI Generated Artwork #${index + 1} - Mint ID: ${mintId}`
      );

      // Step: Mint NFTs for top users
      const mintResult = await mintNFTsForTopUsers(gameId, mintId, topUsers, imageUrls, descriptions);
      console.log(`Minted NFTs for ${topUsers.length} users: ${mintResult.txHash}`);

      const mintData = {
        gameId,
        gameName: game.name,
        mintId: mintId.toString(),
        topUsers,
        prompts,
        imageUrls,
        activeUsersCount: activeUsers.length,
        mintResult: {
          txHash: mintResult.txHash,
          blockNumber: mintResult.blockNumber,
          nftMintedEvents: mintResult.nftMintedEvents
        },
        success: true
      };
      // Persist to database
      await fastify.db.addMint(mintData);

      isMinting[gameId] = false;
      return mintData;
    } catch (error) {
      isMinting[gameId] = false;
      console.error('Error minting NFT:', error);
      return reply.status(500).send({ error: 'Failed to mint NFT' });
    }
  });

  // Get minted NFTs for a game (list recent mints)
  fastify.get('/minted/:gameId', async (req, reply) => {
    const { gameId } = req.params;
    try {
      // Read from DB
      const rows = await fastify.db.getMintsByGame(gameId);
      return { gameId, mints: rows };
    } catch (err) {
      console.error('Error fetching minted data list:', err);
      return reply.status(500).send({ error: 'Failed to fetch minted data' });
    }
  });
};