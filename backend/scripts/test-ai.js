#!/usr/bin/env node

require('dotenv').config();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const { generatePromptsFromGame, generateImageFromPrompt, downloadImage,
        chatbotReply } = require('../src/utils/ai');
const dbModule = require('../src/db_sqlite');

async function testOpenAIIntegration() {
  console.log('🧪 Testing OpenAI Integration...\n');

  try {
    // Initialize database
    const db = dbModule.init();

    // Test: Generate Prompts from Game
    console.log('2️⃣ Testing Prompt Generation...');
    const games = db.getPopularGames(2);
    if (games.length > 0) {
      const prompts = await generatePromptsFromGame(games[games.length-1], 1);
      console.log('✅ Generated Prompts:');
      prompts.forEach((prompt, i) => console.log(`   ${i + 1}. ${prompt}`));
      console.log('');

      // Test: Generate Image from the first prompt
      console.log('3️⃣ Testing Image Generation...');
      const imageUrl = await generateImageFromPrompt(prompts[0]);
      console.log('✅ Generated Image URL:', imageUrl.slice(0, 100) + '...\n');
      // Save image to file
      const outputPath = path.join(__dirname, `${uuidv4()}.png`);
      await downloadImage(imageUrl, outputPath);
      console.log('✅ Image generation and download complete!');

    } else {
      console.log('⚠️ No games found in database. Skipping prompt and image tests.');
    }

    // Test: Chatbot Reply
    console.log('1️⃣ Testing Chatbot Reply...');
    const chatResponse = await chatbotReply('Hello! Can you help me with gaming?', []);
    console.log('✅ Chatbot Response:', chatResponse.substring(0, 100) + '...\n');

    console.log('\n🎉 All OpenAI integration tests completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ OpenAI Integration Test Failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  testOpenAIIntegration().catch(error => {
    console.error('Test script error:', error);
    process.exit(1);
  });
}

module.exports = { testOpenAIIntegration };