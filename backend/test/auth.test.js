const request = require('supertest');
const expect = require('chai').expect;
const uniq = require('uniqid');
const { build } = require('../src/index');
const dbModule = require('../src/db_sqlite');
const { ethers } = require('ethers');

describe('Auth', function() {
  let server, url;
  before(async function() {
    const db = dbModule.init(':memory:');
    server = build({ db });
    await server.listen({ port: 0 });
    const port = server.server.address().port;
    url = `http://127.0.0.1:${port}`;
  });
  after(async function() { await server.close(); });

  it('Web3 login with nonce/signature should return token and create user', async function() {
    const wallet = ethers.Wallet.createRandom();
    const address = wallet.address.toLowerCase();

    // request nonce
    const nres = await request(url).get('/auth/nonce').query({ address });
    expect(nres.status).to.equal(200);
    const nonce = nres.body.nonce;

    // sign
    const signature = await wallet.signMessage(nonce);

    const lres = await request(url).post('/auth/login').send({ address, signature });
    expect(lres.status).to.equal(200);
    expect(lres.body).to.have.property('token');
    expect(lres.body.user).to.have.property('address');
  });
});
