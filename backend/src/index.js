require('dotenv').config();
const Fastify = require('fastify');

function build(opts = {}) {
  const app = Fastify({ logger: true });
  const db = opts.db;

  // make db available to routes via decorate
  app.decorate('db', db);

  // register plugins and routes
  app.register(require('@fastify/cors'), {
    origin: true, // Allow all origins for development
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });
  app.register(require('./plugins/jwt'));
  app.register(require('./routes/health'));
  app.register(require('./routes/auth'), { prefix: '/auth' });
  app.register(require('./routes/games'));
  app.register(require('./routes/reviews'));
  app.register(require('./routes/chat'));
  app.register(require('./routes/web3'), { prefix: '/web3' });

  app.start = async function() {
    const port = process.env.PORT || 3000;
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`Server listening on ${port}`);
  };

  return app;
}

module.exports = { build };

