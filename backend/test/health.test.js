const request = require('supertest');
const expect = require('chai').expect;
const { build } = require('../src/index');
const dbModule = require('../src/db_sqlite');

describe('Health', function() {
  let server, url;
  before(async function() {
    const db = dbModule.init(':memory:');
    server = build({ db });
    await server.listen({ port: 0 });
    url = server.server.address().port ? `http://127.0.0.1:${server.server.address().port}` : 'http://localhost:3000';
  });

  after(async function() {
    await server.close();
  });

  it('GET /health returns ok', async function() {
    const res = await request(url).get('/health');
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('status', 'ok');
  });
});
