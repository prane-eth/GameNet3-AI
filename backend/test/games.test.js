const request = require('supertest');
const expect = require('chai').expect;
const { build } = require('../src/index');
const dbModule = require('../src/db_sqlite');

describe('Games', function() {
  // Allow extra time for external API requests
  this.timeout(5000);
  let server, url;
  before(async function() {
    const db = dbModule.init(':memory:');
    server = build({ db });
    await server.listen({ port: 0 });
    const port = server.server.address().port;
    url = `http://127.0.0.1:${port}`;
  });
  after(async function() { await server.close(); });

  it('GET /games returns data structure', async function() {
    const res = await request(url).get('/games?q=test');
    expect(res.status).to.equal(200);
    // the route returns { source, data }
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.property('data');
  });

  it('Database games methods work correctly', function() {
    // Test creating a game
    const testGame = {
      id: 'test-1',
      name: 'Test Game',
      slug: 'test-game',
      released: '2023-01-01',
      background_image: 'https://example.com/image.jpg',
      rating: 4.5,
      ratings_count: 100,
      metacritic: 85,
      platforms: JSON.stringify(['PC', 'PlayStation']),
      genres: JSON.stringify(['Action', 'Adventure']),
      tags: JSON.stringify(['Single Player', 'Multiplayer']),
      description: 'A test game',
      updatedAt: Date.now()
    };

    // Access db through the server instance
    const db = server.db;

    // This should work without throwing an error
    expect(() => db.createGame(testGame)).to.not.throw();

    // Test retrieving the game
    const retrieved = db.getGameById('test-1');
    expect(retrieved).to.be.an('object');
    expect(retrieved.name).to.equal('Test Game');

    // Test search
    const searchResults = db.searchGames('Test', 10);
    expect(searchResults).to.be.an('array');
    expect(searchResults.length).to.be.greaterThan(0);

    // Test popular games
    const popularGames = db.getPopularGames(10);
    expect(popularGames).to.be.an('array');
  });
});
