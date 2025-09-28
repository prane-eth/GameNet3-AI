const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db;

function init(dbPath) {
  if (!dbPath)
    dbPath = path.resolve(__dirname, '..', 'data', 'dev.db');
  // if directory needed
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
  db = new Database(dbPath);

  // Enable Write-Ahead Logging (WAL) for better concurrency and performance.
  // WAL allows concurrent readers while a writer is active and often improves write throughput.
  // Tradeoffs: single writer at a time still applies, WAL creates a separate -wal file
  db.pragma('journal_mode = WAL');

  db.prepare(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    address TEXT UNIQUE,
    nickname TEXT UNIQUE,
    activity INTEGER DEFAULT 0
  )`).run();

  db.prepare(`CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    gameId TEXT,
    userId TEXT,
    rating INTEGER,
    text TEXT,
    createdAt INTEGER,
    updatedAt INTEGER
  )`).run();

  db.prepare(`CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    released TEXT,
    background_image TEXT,
    rating REAL,
    ratings_count INTEGER,
    metacritic INTEGER,
    platforms TEXT,
    genres TEXT,
    tags TEXT,
    description TEXT,
    updatedAt INTEGER
  )`).run();

  // prepared statements
  const createUserStmt = db.prepare(`INSERT INTO users (id,nickname,activity,address)
                                                VALUES (@id,@nickname,@activity,@address)`);
  const getUserByAddressStmt = db.prepare(`SELECT * FROM users WHERE address = ?`);
  const getUserByNicknameStmt = db.prepare(`SELECT * FROM users WHERE nickname = ?`);
  const getUserByIdStmt = db.prepare(`SELECT * FROM users WHERE id = ?`);
  const incrementActivityStmt = db.prepare(`UPDATE users SET activity = activity + 1 WHERE id = ?`);
  const addReviewStmt = db.prepare(`INSERT INTO reviews (id,gameId,userId,rating,text,createdAt)
                                                 VALUES (@id,@gameId,@userId,@rating,@text,@createdAt)`);
  const updateReviewStmt = db.prepare(`UPDATE reviews SET rating = @rating, text = @text,
                                              updatedAt = @updatedAt WHERE id = @id`);
  const getReviewsByGameStmt = db.prepare(`SELECT r.*, u.nickname FROM reviews r LEFT JOIN users u
                                            ON r.userId = u.id WHERE r.gameId = ? ORDER BY r.createdAt DESC`);
  const getNicknameStmt = db.prepare(`SELECT 1 FROM users WHERE nickname = ? LIMIT 1`);

  // Games prepared statements
  const createGameStmt = db.prepare(`INSERT OR REPLACE INTO games (id,name,slug,released,background_image,
                                      rating,ratings_count,metacritic,platforms,genres,tags,description,updatedAt)
                                    VALUES (@id,@name,@slug,@released,@background_image,@rating,@ratings_count,
                                      @metacritic,@platforms,@genres,@tags,@description,@updatedAt)`);
  const getGameByIdStmt = db.prepare(`SELECT * FROM games WHERE id = ?`);
  const getGameBySlugStmt = db.prepare(`SELECT * FROM games WHERE slug = ?`);
  const searchGamesStmt = db.prepare(`
    SELECT *, 
           (rating * 0.4 + COALESCE(metacritic/20.0, 0) * 0.3 + COALESCE(ratings_count/1000.0, 0) * 0.3) as popularity_score
    FROM games 
    WHERE name LIKE ? 
    ORDER BY popularity_score DESC, rating DESC 
    LIMIT ?
  `);
  const getPopularGamesStmt = db.prepare(`
    SELECT *, 
           (rating * 0.4 + COALESCE(metacritic/20.0, 0) * 0.3 + COALESCE(ratings_count/1000.0, 0) * 0.3) as popularity_score
    FROM games 
    ORDER BY popularity_score DESC, rating DESC 
    LIMIT ?
  `);
  const getGamesCountStmt = db.prepare(`SELECT COUNT(*) as count FROM games`);
  const getActiveUsersStmt = db.prepare(`SELECT * FROM users WHERE activity > 0 ORDER BY activity DESC LIMIT ?`);

  return {
    createUser: (user) => createUserStmt.run(user),
    getUserByAddress: (address) => getUserByAddressStmt.get(address),
    getUserByNickname: (nickname) => getUserByNicknameStmt.get(nickname),
    getUserById: (id) => getUserByIdStmt.get(id),
    incrementActivity: (id) => incrementActivityStmt.run(id),
    addReview: (review) => addReviewStmt.run(review),
    updateReview: (review) => updateReviewStmt.run(review),
    getReviewsByGame: (gameId) => getReviewsByGameStmt.all(gameId),
    isNicknameUnique: (nick) => !getNicknameStmt.get(nick),
    // Games methods
    createGame: (game) => createGameStmt.run(game),
    getGameById: (id) => getGameByIdStmt.get(id),
    getGameBySlug: (slug) => getGameBySlugStmt.get(slug),
    searchGames: (query, limit = 20) => searchGamesStmt.all(`%${query}%`, limit),
    getPopularGames: (limit = 20) => getPopularGamesStmt.all(limit),
    getGamesCount: () => getGamesCountStmt.get().count,
    getActiveUsers: (limit = 10) => getActiveUsersStmt.all(limit),
    _raw: db
  };
}

module.exports = { init };
