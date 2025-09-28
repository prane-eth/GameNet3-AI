const { chatbotReply } = require('../utils/ai');

module.exports = async function (fastify, opts) {
  fastify.post('/chat', async (req, reply) => {
    const { message, history, userId, gameContext } = req.body || {};
    console.log('Chat request:', { message, userId, gameContext });

    if (!message)
      return reply.status(400).send({ error: 'message is required' });

    try {
      // Prepare conversation history with proper format
      let conversationHistory = [];
      if (history && Array.isArray(history)) {
        conversationHistory = history.map(h => ({
          role: h.role || 'user',
          content: h.content || h.message || ''
        }));
      }

      // Add gaming context if provided
      if (gameContext) {
        const contextMessage = `Current game context: ${gameContext.name || 'Unknown game'}`;
        if (gameContext.description) {
          contextMessage += ` - ${gameContext.description}`;
        }
        conversationHistory.unshift({
          role: 'system',
          content: contextMessage
        });
      }
      console.log('Conversation history:', conversationHistory);
      console.log('User message:', message);
      const aiResponse = await chatbotReply(message, conversationHistory);

      return {
        reply: aiResponse,
        timestamp: new Date().toISOString(),
        userId: userId || null
      };
    } catch (error) {
      console.error('Chat error:', error);
      return reply.status(500).send({
        error: 'Failed to get AI response',
        reply: 'Sorry, I\'m having trouble connecting right now. Please try again later!'
      });
    }
  });

  // Get chat history for a user (if we want to persist chat history later)
  fastify.get('/chat/history/:userId', async (req, reply) => {
    const { userId } = req.params;

    // For now, return empty history since we're not persisting chat yet
    return {
      userId,
      history: [],
      message: 'Chat history feature coming soon'
    };
  });
};
