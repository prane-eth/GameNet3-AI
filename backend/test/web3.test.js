const request = require('supertest');
const expect = require('chai').expect;
const { ethers } = require('ethers');
const { build } = require('../src/index');
const dbModule = require('../src/db_sqlite');
const {
  getNextMint,
  participateInMint,
  readyToMint,
  getProvider,
  getWallet,
  getContract,
  getGamingPlatformContract
} = require('../src/utils/web3');

// Mock AI functions for testing
const mockGeneratePromptsFromGame = async (game, count) => {
  return [
    `Create a stunning digital artwork inspired by ${game.name}`,
    `Generate an epic poster featuring ${game.name} in a cyberpunk style`,
    `Design a beautiful illustration of ${game.name} with vibrant colors`
  ].slice(0, count);
};

const mockGenerateImageFromPrompt = async (prompt) => {
  return `https://placehold.co/1024x1024?text=${encodeURIComponent(prompt.substring(0, 50))}`;
};

// Override the AI functions in the routes for testing
const originalAi = require('../src/utils/ai');
originalAi.generatePromptsFromGame = mockGeneratePromptsFromGame;
originalAi.generateImageFromPrompt = mockGenerateImageFromPrompt;

describe('Web3 NFT Minting', function() {
  // Allow extra time for blockchain operations
  this.timeout(30000);

  let server, url, db;
  let testUsers = [];
  let testGame;

  before(async function() {
    // Initialize database with test data
    db = dbModule.init(':memory:');

    // Create test users with addresses
    for (let i = 0; i < 5; i++) {
      const wallet = ethers.Wallet.createRandom();
      const user = {
        id: `test-user-${i}`,
        address: wallet.address,
        nickname: `TestUser${i}`,
        activity: Math.floor(Math.random() * 100) + 1
      };
      db.createUser(user);
      testUsers.push(user);
    }

    // Create a test game with string ID (for database compatibility)
    testGame = {
      id: 'test-game-1', // Use string ID for database
      name: 'Test Game for NFT Minting',
      slug: 'test-game-nft',
      released: '2024-01-01',
      background_image: 'https://example.com/test-game.jpg',
      rating: 4.5,
      ratings_count: 100,
      metacritic: 85,
      platforms: JSON.stringify(['PC', 'PlayStation']),
      genres: JSON.stringify(['Action', 'RPG']),
      tags: JSON.stringify(['Single Player', 'Fantasy']),
      description: 'A test game for NFT minting functionality',
      updatedAt: Date.now()
    };
    db.createGame(testGame);

    // Build server
    server = build({ db });
    await server.listen({ port: 0 });
    const port = server.server.address().port;
    url = `http://127.0.0.1:${port}`;
  });

  after(async function() {
    await server.close();
  });

  describe('Environment Setup', function() {
    it('should have required environment variables', function() {
      expect(process.env.RPC_URL).to.be.a('string');
      expect(process.env.LOCAL_PRIVATE_KEY).to.be.a('string');
      expect(process.env.GAMING_PLATFORM_ADDRESS).to.be.a('string');
      expect(process.env.NFT_CONTRACT_ADDRESS).to.be.a('string');
    });

    it('should connect to blockchain provider', async function() {
      const provider = getProvider();
      expect(provider).to.be.instanceOf(ethers.JsonRpcProvider);

      // Test connection by getting network
      const network = await provider.getNetwork();
      expect(network).to.have.property('chainId');
    });

    it('should create wallet from private key', function() {
      const wallet = getWallet();
      expect(wallet).to.be.instanceOf(ethers.Wallet);
      expect(wallet.address).to.match(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should create contract instances', function() {
      const gamingContract = getGamingPlatformContract();
      const nftContract = getContract();

      expect(gamingContract).to.be.instanceOf(ethers.Contract);
      expect(nftContract).to.be.instanceOf(ethers.Contract);
    });
  });

  describe('Database Setup', function() {
    it('should have test users with addresses', function() {
      const activeUsers = db.getActiveUsers(10);
      expect(activeUsers).to.have.lengthOf.at.least(3);
      activeUsers.forEach(user => {
        expect(user.address).to.match(/^0x[a-fA-F0-9]{40}$/);
        expect(user.activity).to.be.greaterThan(0);
      });
    });

    it('should have test game', function() {
      const game = db.getGameById(testGame.id);
      expect(game).to.not.be.null;
      expect(game.name).to.equal(testGame.name);
    });
  });

  describe('Web3 Utility Functions', function() {
    let gameId, mintId;

    before(function() {
      gameId = testGame.id;
    });

    it('should get next mint ID', async function() {
      mintId = await getNextMint(gameId);
      expect(mintId).to.not.be.null;
      expect(typeof mintId).to.equal('bigint');
      console.log(`Next mint ID: ${mintId}`);
    });

    it('should participate in mint', async function() {
      // Use a different mint ID to avoid conflicts with API tests
      const freshMintId = 2n;
      const result = await participateInMint(gameId, freshMintId);

      // Check if participation was successful or already participated
      if (result.alreadyParticipated) {
        expect(result.txHash).to.be.null;
        expect(result.alreadyParticipated).to.be.true;
        console.log(`Already participated in mint ${freshMintId} for game ${gameId}`);
      } else {
        expect(result).to.have.property('txHash');
        expect(result.txHash).to.match(/^0x[a-fA-F0-9]{64}$/);
        console.log(`Participation tx: ${result.txHash}`);
      }

      expect(result.gameId).to.equal(gameId);
      expect(result.mintId).to.equal(freshMintId);
    });

    it('should not participate again in the same mint', async function() {
      const freshMintId = 2n;
      const result = await participateInMint(gameId, freshMintId);
      expect(result.alreadyParticipated).to.be.true;
      expect(result.txHash).to.be.null;
      console.log(`Already participated in mint ${freshMintId} for game ${gameId}`);
    });

    it('should check if ready to mint', async function() {
      const isReady = await readyToMint(gameId, mintId);
      expect(typeof isReady).to.equal('boolean');
      console.log(`Ready to mint ${mintId}: ${isReady}`);
    });
  });

  describe('NFT Minting API Endpoint', function() {
    it('should return error for missing gameId', async function() {
      const res = await request(url)
        .post('/ai/mint-nft')
        .send({});

      expect(res.status).to.equal(400);
      expect(res.body.error).to.equal('gameId is required');
    });

    it('should return error for non-existent game', async function() {
      const res = await request(url)
        .post('/ai/mint-nft')
        .send({ gameId: 'non-existent-game' });

      expect(res.status).to.equal(404);
      expect(res.body.error).to.equal('Game not found');
    });

    it('should handle NFT minting request (may fail if blockchain not available)', async function() {
      const res = await request(url)
        .post('/ai/mint-nft')
        .send({ gameId: testGame.id });

      // The request might succeed or fail depending on blockchain availability
      if (res.status === 200) {
        expect(res.body).to.have.property('success', true);
        expect(res.body).to.have.property('mintId');
        expect(res.body).to.have.property('mintResult');
        console.log('NFT minting successful:', res.body.mintResult);
      } else {
        // If it fails, it should be due to blockchain issues, not validation
        expect([400, 500]).to.include(res.status);
        console.log('NFT minting failed (expected if blockchain not available):', res.body.error);
      }
    });
  });

  describe('NFT Metadata Endpoint', function() {
    it('should generate NFT metadata', async function() {
      const res = await request(url)
        .get(`/ai/metadata/${testGame.id}/1234567890`);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('name');
      expect(res.body).to.have.property('description');
      expect(res.body).to.have.property('image');
      expect(res.body).to.have.property('attributes');
      expect(res.body.name).to.include(testGame.name);
    });

    it('should return error for non-existent game', async function() {
      const res = await request(url)
        .get('/ai/metadata/non-existent-game/1234567890');

      expect(res.status).to.equal(404);
      expect(res.body.error).to.equal('Game not found');
    });
  });
});