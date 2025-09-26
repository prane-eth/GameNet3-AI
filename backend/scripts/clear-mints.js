const dbModule = require('../src/db_sqlite');

async function clearMints() {
  const db = dbModule.init();

  console.log('Clearing mints table...');
  try {
    db._raw.prepare('DELETE FROM mints').run();
    // Reset sqlite sequence if exists
    try {
      db._raw.prepare("DELETE FROM sqlite_sequence WHERE name='mints'").run();
    } catch (e) {
      // ignore if table not present in seq
    }
    console.log('All mints removed from database.');
  } catch (err) {
    console.error('Failed to clear mints table:', err);
    throw err;
  }
}

if (require.main === module) {
  clearMints()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error clearing mints:', err);
      process.exit(1);
    });
}

module.exports = { clearMints };