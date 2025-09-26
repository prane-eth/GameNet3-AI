const fp = require('fastify-plugin');
const fastifyJwt = require('@fastify/jwt');

module.exports = fp(async function (fastify, opts) {
  fastify.register(fastifyJwt, { secret: process.env.JWT_SECRET || 'change-me' });

  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });
});
