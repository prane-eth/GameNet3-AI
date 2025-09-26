const request = require('supertest');
const expect = require('chai').expect;
const { build } = require('../src/index');
const dbModule = require('../src/db_sqlite');
const { ethers } = require('ethers');

describe('Reviews', function() {
  let server, url, token;
  this.timeout(10000); // Increase timeout for AI calls
  before(async function() {
    const db = dbModule.init(':memory:');
    server = build({ db });
    await server.listen({ port: 0 });
    const port = server.server.address().port;
    url = `http://127.0.0.1:${port}`;

    // authenticate via web3 flow
    const wallet = ethers.Wallet.createRandom();
    const address = wallet.address.toLowerCase();
    const nres = await request(url).get('/auth/nonce').query({ address });
    const signature = await wallet.signMessage(nres.body.nonce);
    const lres = await request(url).post('/auth/login').send({ address, signature });
    token = lres.body.token;
  });
  after(async function() { await server.close(); });

  it('POST /reviews should block review with banned words', async function() {
    const res = await request(url)
      .post('/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ gameId: 'game-1', rating: 1, text: 'This game is a badword!' });
    expect(res.status).to.equal(400);
    expect(res.body).to.have.property('error', 'review blocked');
    expect(res.body).to.have.property('reason', 'contains banned words');
  });

  it('POST /reviews should block review with swear words (AI moderation)', async function() {
    const res = await request(url)
      .post('/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ gameId: 'game-1', rating: 1, text: 'This game is fucking terrible!' });
    expect(res.status).to.equal(400);
    expect(res.body).to.have.property('error', 'review blocked');
    expect(res.body).to.have.property('reason', 'contains inappropriate language');
  });

  it('POST /reviews should allow clean review', async function() {
    const res = await request(url)
      .post('/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ gameId: 'game-1', rating: 5, text: 'This is an amazing game!' });
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('ok', true);
  });

  it('GET /reviews/:gameId should return reviews', async function() {
    const res = await request(url).get('/reviews/game-1');
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
  });
});
