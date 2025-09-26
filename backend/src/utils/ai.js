// AI integration stubs. Replace with real OpenAI (or other) calls.
require('dotenv').config();
const OpenAI = require('openai');
const path = require('path');
const download = require('download');

// Create OpenAI client; tolerate missing API key in tests by using a dummy key
const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});

// Azure OpenAI client for image generation
const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
const azureApiVersion = process.env.OPENAI_API_VERSION;
const azureOpenAI = new OpenAI.AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: `${azureEndpoint}openai/deployments/${azureDeployment}`,
  apiVersion: azureApiVersion,
});

async function moderateReview(text) {
  if (!text || text.trim().length === 0) {
    return { allowed: true };
  }

  // First check for basic banned words
  const banned = ['badword', 'hack', 'cheat'];
  const low = text.toLowerCase();
  for (const b of banned) {
    if (low.includes(b)) {
      return { allowed: false, reason: 'contains banned words' };
    }
  }

  // Check for common swear words as fallback
  const swearWords = ['fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard', 'crap'];
  for (const swear of swearWords) {
    if (low.includes(swear)) {
      return { allowed: false, reason: 'contains inappropriate language' };
    }
  }

  try {
    // Use OpenAI for additional content moderation with timeout
    const response = await Promise.race([
      openai.moderations.create({
        input: text,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI moderation timeout')), 5000)
      )
    ]);

    const result = response.results[0];
    if (result.flagged) {
      return { allowed: false, reason: 'contains inappropriate content' };
    }

    return { allowed: true };
  } catch (error) {
    console.error('AI moderation error:', error.message);
    // Fallback to basic check if AI fails
    return { allowed: true };
  }
}

// image style options
const imageStyles = [
  'realistic', 'cartoon', 'abstract', 'surreal', 'pixel art',
  'fantasy', 'cyberpunk', 'vaporwave', 'minimalist', 'watercolor',
  'oil painting', 'sketch', 'line art', '3D render', 'isometric', 'low poly'
];

// Deterministic PRNG and shuffle for seeded style selection
function seededRandom(seed) {
  let x = Math.floor(Number(seed) || 0) % 2147483647;
  if (x <= 0) x += 2147483646;
  return () => (x = (x * 16807) % 2147483647) / 2147483647;
}

function shuffleWithSeed(arr, seed) {
  const rnd = seededRandom(seed);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function generatePromptsFromGame(game, n = 1, styleOptions = true) {
  try {
    console.log(`Generating ${n} prompts for game: ${game.name}`);
    const gameInfo = `${game.name}${game.description ? ' - ' + game.description : ''}` +
            `${game.genres ? ' - Genres: ' + JSON.parse(game.genres || '[]').join(', ') : ''}`;

    // Pick styles, shuffled for diversity
    let selectedStyles;
    if (Array.isArray(styleOptions)) {
      selectedStyles = styleOptions.slice(0, n);
    } else if (typeof styleOptions === 'number') {
      selectedStyles = shuffleWithSeed(imageStyles, styleOptions).slice(0, n);
    } else if (styleOptions && typeof styleOptions === 'object') {
      if (Array.isArray(styleOptions.styles)) {
        selectedStyles = styleOptions.styles.slice(0, n);
      } else if (typeof styleOptions.seed === 'number') {
        selectedStyles = shuffleWithSeed(imageStyles, styleOptions.seed).slice(0, n);
      } else if (styleOptions.random === false) {
        selectedStyles = imageStyles.slice(0, n);
      } else {
        selectedStyles = imageStyles.slice(0, n);
      }
    } else if (styleOptions === false) {
      selectedStyles = imageStyles.slice(0, n);
    } else {
      // random
      const shuffledStyles = imageStyles.sort(() => 0.5 - Math.random());
      selectedStyles = shuffledStyles.slice(0, n);
    }
    const prompt = `
      Generate ${n} creative and detailed image prompts for a gaming poster/artwork
      based on this game: "${gameInfo}".
      Each prompt should be artistic, visually striking, and suitable for AI image generation.
      Focus on gaming aesthetics, atmosphere, and key visual elements for NFTs.
      Make those very concise.
      Image styles for ${n} images: ${selectedStyles.join(', ')}.
      Return only the prompts as a JSON array of strings, no additional text.
      Ensure prompt or generate image exclude weapons and violence.
    `;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_completion_tokens: 1000,
      // temperature: 0.8,
    });

    const content = response.choices[0].message.content.trim();

    // Try to parse as JSON, fallback to splitting by newlines if needed
    try {
      const prompts = JSON.parse(content);
      return Array.isArray(prompts) ? prompts.slice(0, n) : [content];
    } catch {
      // Fallback: split by newlines and clean up
      const prompts = content.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 10)
        .slice(0, n);
      return prompts.length > 0 ? prompts : [`Artistic poster for ${game.name}`];
    }
  } catch (error) {
    console.error('Error generating prompts:', error.message);
    // Fallback to simple prompts
    const prompts = [];
    for (let i = 0; i < n; i++) {
      prompts.push(`Artistic gaming poster for ${game.name} - creative style ${i + 1}`);
    }
    return prompts;
  }
}

async function generateImageFromPrompt(prompt) {
  try {
    const response = await azureOpenAI.images.generate({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      prompt: prompt,
      size: '1024x1024',
      quality: 'standard',
      temperature: 0.7,
      n: 1,
    });

    // Handle different response formats (URL or base64)
    const imageData = response.data[0];
    if (imageData.url) {
      return imageData.url;
    } else if (imageData.b64_json) {
      return `data:image/png;base64,${imageData.b64_json}`;
    } else {
      console.warn('No URL or base64 data in response');
      throw new Error('No image data in response');
    }
  } catch (error) {
    console.error('Error generating image:', error.message);
    console.error('Error status:', error.status);
    return `https://placehold.co/1024x1024?text=${encodeURIComponent(prompt.substring(0, 50))}`;
  }
}


// Function to download and save image from URL
async function downloadImage(url, filename) {
  try {
    if (url.startsWith('data:')) {
      // Handle base64 data URL
      const base64Data = url.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      require('fs').writeFileSync(filename, buffer);
      console.log(`Image saved as ${filename}`);
      return filename;
    } else {
      // Handle regular HTTP/HTTPS URL
      await download(url, path.dirname(filename), { filename: path.basename(filename) });
      console.log(`Image saved as ${filename}`);
      return filename;
    }
  } catch (err) {
    console.error('Download failed:', err.message);
    throw err;
  }
}

const botSystemPrompt = 'You are a helpful AI assistant for a decentralized gaming platform.' +
  ' You help users with gaming discussions, blockchain/Web3 topics, and general' +
  ' gaming community questions. Be concise, friendly, knowledgeable, and engaging.' +
  ' Guide for new users: Click on Connect Wallet button to link your crypto wallet.' +
  ' To explore games, click on "Games" in the top menu. Select a game and submit a review.' +
  ' On the game details page, scroll down to see NFT details and number of current votes for minting.' +
  ' Vote for your favorite games to help them get minted as NFTs. NFTs are minted to active users.';

const aiServiceApology = `I apologize, but I'm having trouble connecting to my AI services ` +
  `right now. You asked: <message>. Please try again later!`;

async function chatbotReply(message, history = []) {
  try {
    // Prepare conversation history
    const messages = [
      { role: 'system', content: botSystemPrompt },
      ...history.slice(-10).map(h => ({ role: h.role, content: h.content })), // Keep last few messages
      { role: 'user', content: message }
    ];

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: messages,
      max_completion_tokens: 500,
      // temperature: 0.7,
    });

    const chatbotReply = response.choices[0].message.content.trim();
    if (chatbotReply.length === 0) {
      // Attempt again
      const newResponse = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL,
        messages: messages,
        max_completion_tokens: 500,
      });
      const newReply = newResponse.choices[0].message.content.trim();
      if (newReply.length === 0) {
        throw new Error('Empty reply from AI service');
      }
      return newReply;
    }
  } catch (error) {
    console.error('Error getting chatbot reply:', error.message);
    // Fallback response
    return aiServiceApology.replace('<message>', message);
  }
}

module.exports = {
  moderateReview, generatePromptsFromGame, generateImageFromPrompt,
  downloadImage, chatbotReply
};

