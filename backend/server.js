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

    // Graceful shutdown to free the port when VS Code stops debugging or user presses Ctrl+C
    const shutdown = async (signal) => {
      try {
        console.log(`Received ${signal}. Shutting down server...`);
        if (global.__fastifyApp && global.__fastifyApp.close) {
          await global.__fastifyApp.close();
        }
        process.exit(0);
      } catch (err) {
        console.error('Error during shutdown', err);
        process.exit(1);
      }
    };

    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGQUIT', () => shutdown('SIGQUIT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();