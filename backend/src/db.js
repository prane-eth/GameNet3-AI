// Simple in-memory store for prototype
const users = new Map(); // userId -> { id, nickname, tokens, activity }
const reviews = new Map(); // gameId -> [ { id, userId, rating, text, createdAt } ]

module.exports = { users, reviews };
