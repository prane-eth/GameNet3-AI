const { ethers } = require('ethers');
const uniqid = require('uniqid');
const { moderateReview } = require('../utils/ai');
const { generateNick } = require('../utils/nickname');

module.exports = async function (fastify, opts) {

  // add review
  fastify.post('/reviews', async (req, reply) => {
    const { gameId, rating, text, signature, message } = req.body || {};
    if (!gameId || !rating || !signature || !message)
      return reply.status(400).send({ error: 'gameId, rating, signature, and message required' });

    // Verify the signature
    try {
      const recovered = ethers.verifyMessage(message, signature);
      const userAddress = recovered.toLowerCase();
      
      const db = fastify.db;
      let user = db.getUserByAddress(userAddress);
      
      // If user doesn't exist, create one (for testing)
      if (!user) {
        const isUnique = (nick) => !db.getUserByNickname(nick);
        const nickname = generateNick(isUnique);
        user = { id: uniqid(), nickname, tokens: 0, activity: 0, address: userAddress };
        db.createUser(user);
      }

      const userId = user.id;

      // Check if user already has a review for this game
      const existingReviews = db.getReviewsByGame(gameId) || [];
      const existingReview = existingReviews.find(review => review.userId === userId);

      // Verify the message format
      const expectedPrefix = `Rate game ${gameId} with ${rating} stars at `;
      if (!message.startsWith(expectedPrefix))
        return reply.status(400).send({ error: 'invalid message format' });

      // AI moderation
      const mod = await moderateReview(text || '');
      if (!mod.allowed)
        return reply.status(400).send({ error: 'review blocked', reason: mod.reason });

      let entry;
      if (existingReview) {
        // Update existing review
        entry = { 
          id: existingReview.id, 
          gameId, 
          userId, 
          rating: Number(rating), 
          text: text || '', 
          createdAt: existingReview.createdAt,
          updatedAt: Date.now()
        };
        db.updateReview(entry);
      } else {
        // Create new review
        entry = { id: uniqid(), gameId, userId, rating: Number(rating), text: text || '', createdAt: Date.now() };
        db.addReview(entry);
      }

      // bump user activity
      try {
        db.incrementActivity(userId);
        // verify increment applied; if not, set to 1 as a fallback
        const after = db.getUserById(userId);
        console.log('User activity after increment:', { userId, activity: after ? after.activity : null });
        if (!after || !after.activity || Number(after.activity) <= 0) {
          try {
            fastify.db._raw.prepare('UPDATE users SET activity = 1 WHERE id = ?').run(userId);
            console.log('Applied fallback activity=1 for user', userId);
          } catch (e) {
            console.error('Failed to apply activity fallback for user', userId, e);
          }
        }
      } catch (incErr) {
        console.error('Error incrementing user activity for', userId, incErr);
      }

      return { ok: true, review: entry, updated: !!existingReview };
    } catch (err) {
      console.error('Signature verification failed:', err);
      return reply.status(400).send({ error: 'signature verification failed' });
    }
  });

  fastify.get('/reviews/:gameId', async (req, reply) => {
    const gameId = req.params.gameId;
    const arr = fastify.db.getReviewsByGame(gameId) || [];
    return arr;
  });

  // Debug endpoint: list users and activity (dev only)
  fastify.get('/admin/users', async (req, reply) => {
    try {
      const rows = fastify.db._raw.prepare('SELECT id, address, nickname, activity FROM users ORDER BY activity DESC').all();
      return rows;
    } catch (err) {
      console.error('Failed to list users for admin:', err);
      return reply.status(500).send({ error: 'Failed to list users' });
    }
  });
};
