const { generateNick } = require('../utils/nickname');
const uniqid = require('uniqid');
const { ethers } = require('ethers');

// in-memory nonces for login flow (short lived)
const nonces = new Map();

module.exports = async function (fastify, opts) {
  // request a nonce for an address
  fastify.get('/nonce', async (req, reply) => {
    const address = (req.query.address || '').toLowerCase();
    if (!address) return reply.status(400).send({ error: 'address required' });
    const nonce = 'Login nonce: ' + uniqid();
    nonces.set(address, nonce);
    // set timeout to remove nonce after 5 minutes
    setTimeout(() => nonces.delete(address), 5 * 60 * 1000);
    return { address, nonce };
  });

  // login with signature: { address, signature }
  fastify.post('/login', async (req, reply) => {
    const { address, signature } = req.body || {};
    if (!address || !signature) return reply.status(400).send({ error: 'address and signature required' });
    const addr = address.toLowerCase();
    const nonce = nonces.get(addr);
    if (!nonce) return reply.status(400).send({ error: 'nonce not requested or expired' });

    try {
      const recovered = ethers.verifyMessage(nonce, signature);
      if (recovered.toLowerCase() !== addr) return reply.status(401).send({ error: 'invalid signature' });
    } catch (err) {
      return reply.status(400).send({ error: 'signature verification failed' });
    }

    const db = fastify.db;
    const existing = db.getUserByAddress(addr);
    if (existing) return reply.status(400).send({ error: 'address already registered' });

    const id = uniqid();
    const isUnique = (nick) => !db.getUserByNickname(nick);
    const nickname = generateNick(isUnique);
    const user = { id, nickname, tokens: 0, activity: 0, address: addr };
    db.createUser(user);

    // nonce consumed
    nonces.delete(addr);

    const token = fastify.jwt.sign({ id: user.id, address: addr });
    return { user: { id: user.id, nickname: user.nickname, address: user.address }, token };
  });
};
