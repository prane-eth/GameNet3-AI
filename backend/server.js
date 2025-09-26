require('dotenv').config();
const { build } = require('./src/index');
const dbModule = require('./src/db_sqlite');

async function startServer() {
  try {
    // Initialize database
    const db = dbModule.init();

    // Build the Fastify app
    const app = build({ db });

    // Start the server
    await app.start();

    console.log('Server started successfully');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();