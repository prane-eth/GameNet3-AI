module.exports = async function (fastify, opts) {
  fastify.get('/', async (req, reply) => {
    return { status: 'ok', time: Date.now() };
  });
  fastify.get('/health', async (req, reply) => {
    return { status: 'ok', time: Date.now() };
  });
};
