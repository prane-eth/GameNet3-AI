// Removes games without background_image or rating from Steam, or with pre-order in name

const dbModule = require('../src/db_sqlite');
require('dotenv').config();

async function cleanGames() {
  console.log('Initializing database...');
  const db = dbModule.init();

  const initialCount = db.getGamesCount();
  console.log(`Initial games count: ${initialCount}`);

  // Get games without background_image or rating, or with pre-order in name
  const gamesToDelete = db._raw.prepare(`
    SELECT id, name FROM games
    WHERE background_image IS NULL OR background_image = '' OR rating IS NULL
    OR LOWER(name) LIKE '%pre-order%' OR LOWER(name) LIKE '%preorder%' OR LOWER(name) LIKE '%pre order%'
  `).all();

  console.log(`Found ${gamesToDelete.length} games to delete:`);
  gamesToDelete.forEach(game => {
    console.log(`- ${game.name} (ID: ${game.id})`);
  });

  if (gamesToDelete.length === 0) {
    console.log('No games to clean.');
    return;
  }

  // Confirm deletion
  console.log('\nDeleting games...');

  const deleteStmt = db._raw.prepare('DELETE FROM games WHERE id = ?');

  let deletedCount = 0;
  for (const game of gamesToDelete) {
    try {
      const result = deleteStmt.run(game.id);
      if (result.changes > 0) {
        deletedCount++;
      }
    } catch (error) {
      console.error(`Error deleting game ${game.name}:`, error.message);
    }
  }

  const finalCount = db.getGamesCount();
  console.log(`\nCleanup completed!`);
  console.log(`Deleted: ${deletedCount} games`);
  console.log(`Final games count: ${finalCount}`);
  console.log(`Removed ${initialCount - finalCount} games total`);
}

if (require.main === module) {
  cleanGames().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}