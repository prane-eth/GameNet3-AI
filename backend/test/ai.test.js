// const request = require('supertest');
// const expect = require('chai').expect;
// const nock = require('nock');
// const fs = require('fs');
// const path = require('path');
// const { build } = require('../src/index');
// const dbModule = require('../src/db_sqlite');
// const { generatePromptsFromGame, generateImageFromPrompt, chatbotReply } = require('../src/utils/ai');

// const recordingsDir = path.join(__dirname, 'recordings');

// describe('AI Integration', function() {
//   this.timeout(30000); // 30 seconds for AI operations
//   let server, url, db;

//   // Ensure recordings directory exists
//   before(function() {
//     if (!fs.existsSync(recordingsDir)) {
//       fs.mkdirSync(recordingsDir, { recursive: true });
//     }
//   });

//   before(async function() {
//     db = dbModule.init(':memory:');
//     server = build({ db });
//     await server.listen({ port: 0 });
//     const port = server.server.address().port;
//     url = `http://127.0.0.1:${port}`;
//   });

//   after(async function() {
//     await server.close();
//   });

//   describe('AI Endpoints', function() {
//     let nockRecorder;
//     let onNoMatch;
//     let recorderStarted = false;
//     const shouldAppend = process.env.RECORD_APPEND === 'true';

//     before(function() {
//       console.log(`🔧 Setting up AI Endpoints test environment. RECORD=${process.env.RECORD} (type: ${typeof process.env.RECORD})`);

//       // Always load existing recordings so matches are served immediately
//       console.log('📂 Loading existing recordings...');
//       loadRecordings();

//       // Allow network for Fastify server requests; OpenAI calls are intercepted by nock
//       try {
//         nock.enableNetConnect();
//       } catch {}

//       // In RECORD mode: start recorder lazily only when a request is NOT matched
//       if (process.env.RECORD && shouldAppend) {
//         onNoMatch = (req) => {
//           if (recorderStarted) return;
//           try {
//             const method = req && req.method ? req.method : 'UNKNOWN';
//             const path = req && (req.options && req.options.path || req.path || req.href || '');
//             console.log(`🔴 No match for request, starting recorder: ${method} ${path}`);
//           } catch {}
//           nockRecorder = nock.recorder.rec();
//           recorderStarted = true;
//         };
//         nock.emitter.on('no match', onNoMatch);
//       }
//     });

//     after(function() {
//       // Remove no-match listener if attached
//       if (onNoMatch) {
//         nock.emitter.removeListener('no match', onNoMatch);
//         onNoMatch = null;
//       }

//       if (process.env.RECORD && process.env.RECORD !== 'false'
//           && shouldAppend && recorderStarted) {
//         // Save recordings to file
//         const recordings = nock.recorder.play();
//         saveRecordings(recordings);
//         nockRecorder = null;
//         recorderStarted = false;
//       }
//       // Stop the recorder and clean all nocks
//       nock.recorder.clear();
//       nock.cleanAll();
//       nock.restore();
//     });

//     // Always run tests - no conditional skipping
//     it('should generate prompts for a game', async function() {
//         // Inherits 30s timeout from parent describe
//         // Add a test game to the database
//         const gameData = {
//           id: 'test-game-1',
//           name: 'Test Game',
//           slug: 'test-game',
//           released: '2024-01-01',
//           background_image: null,
//           rating: 8.5,
//           ratings_count: 100,
//           metacritic: 85,
//           platforms: 'PC,PS5',
//           genres: '["Action","Adventure"]',
//           tags: 'single-player',
//           description: 'A test game for AI prompts',
//           updatedAt: 1758296931664
//         };
//         db.createGame(gameData);

//         const response = await request(url)
//           .post('/ai/generate-prompts')
//           .send({ gameId: gameData.id, count: 2 });

//         expect(response.status).to.equal(200);
//         expect(response.body).to.have.property('gameId', gameData.id);
//         expect(response.body).to.have.property('prompts');
//         expect(response.body.prompts).to.be.an('array');
//         expect(response.body.prompts).to.have.length(2);
//       });

//       it('should generate image from prompt', async function() {
//         const testPrompt = 'A beautiful landscape with mountains and a lake';

//         const response = await request(url)
//           .post('/ai/generate-image')
//           .send({ prompt: testPrompt });

//         expect(response.status).to.equal(200);
//         expect(response.body).to.have.property('prompt', testPrompt);
//         expect(response.body).to.have.property('imageUrl');
//         expect(response.body.imageUrl).to.be.a('string');
//       });

//       it('should generate game artwork (prompts + images)', async function() {
//         // Add a test game
//         const gameData = {
//           id: 'test-game-2',
//           name: 'Fantasy RPG',
//           slug: 'fantasy-rpg',
//           released: '2024-01-01',
//           background_image: null,
//           rating: 9.0,
//           ratings_count: 500,
//           metacritic: 90,
//           platforms: 'PC,PS5,Xbox',
//           genres: '["RPG","Fantasy"]',
//           tags: 'single-player,multiplayer',
//           description: 'An epic fantasy role-playing game',
//           updatedAt: 1758296931664
//         };
//         db.createGame(gameData);

//         const response = await request(url)
//           .post('/ai/generate-game-artwork')
//           .send({ gameId: gameData.id, promptCount: 1, generateImages: true });

//         expect(response.status).to.equal(200);
//         expect(response.body).to.have.property('gameId', gameData.id);
//         expect(response.body).to.have.property('prompts');
//         expect(response.body).to.have.property('images');
//         expect(response.body.prompts).to.be.an('array');
//         expect(response.body.images).to.be.an('array');
//       });

//     it('should handle invalid game ID', async function() {
//       const response = await request(url)
//         .post('/ai/generate-prompts')
//         .send({ gameId: 99999 });

//       expect(response.status).to.equal(404);
//       expect(response.body).to.have.property('error', 'Game not found');
//     });

//     it('should handle missing prompt', async function() {
//       const response = await request(url)
//         .post('/ai/generate-image')
//         .send({});

//       expect(response.status).to.equal(400);
//       expect(response.body).to.have.property('error', 'prompt is required');
//     });

//     it('should handle too long prompt', async function() {
//       const longPrompt = 'A'.repeat(1001);

//       const response = await request(url)
//         .post('/ai/generate-image')
//         .send({ prompt: longPrompt });

//       expect(response.status).to.equal(400);
//       expect(response.body).to.have.property('error', 'Prompt too long (max 1000 characters)');
//     });
//   });

//   describe('AI Utility Functions', function() {
//     let nockRecorder;
//     let onNoMatch;
//     let recorderStarted = false;
//     const shouldAppend = process.env.RECORD_APPEND === 'true';

//     before(function() {
//       console.log(`🔧 Setting up AI Utility Functions test environment. RECORD=${process.env.RECORD} (type: ${typeof process.env.RECORD})`);

//       // Always load existing recordings so matches are served immediately
//       console.log('📂 Loading existing recordings...');
//       loadRecordings();

//       // Block outbound network except localhost (fastify server)
//       try {
//         nock.disableNetConnect();
//         nock.enableNetConnect('127.0.0.1');
//         nock.enableNetConnect('::1');
//       } catch {}

//       // In RECORD mode: start recorder lazily only when a request is NOT matched
//       if (process.env.RECORD && shouldAppend) {
//         onNoMatch = (req) => {
//           if (recorderStarted) return;
//           try {
//             const method = req && req.method ? req.method : 'UNKNOWN';
//             const path = req && (req.options && req.options.path || req.path || req.href || '');
//             console.log(`🔴 No match for request, starting recorder: ${method} ${path}`);
//           } catch {}
//           nockRecorder = nock.recorder.rec();
//           recorderStarted = true;
//         };
//         nock.emitter.on('no match', onNoMatch);
//       }
//     });

//     after(function() {
//       // Remove no-match listener if attached
//       if (onNoMatch) {
//         nock.emitter.removeListener('no match', onNoMatch);
//         onNoMatch = null;
//       }

//       if (process.env.RECORD && shouldAppend && recorderStarted) {
//         // Save recordings to file
//         const recordings = nock.recorder.play();
//         saveRecordings(recordings);
//         nockRecorder = null;
//         recorderStarted = false;
//       }
//       nock.recorder.clear();
//       nock.cleanAll();
//       nock.restore();
//     });

//     // Always run tests - no conditional skipping
//     it('should generate prompts from game data', async function() {
//       const testGame = {
//         name: 'Test RPG',
//         description: 'An amazing RPG game',
//         genres: JSON.stringify(['RPG', 'Fantasy'])
//       };

//   // Use explicit styles to match existing recordings if present
//   const prompts = await generatePromptsFromGame(testGame, 2, ['realistic', 'cartoon']);
//       expect(prompts).to.be.an('array');
//       expect(prompts).to.have.length(2);
//       prompts.forEach(prompt => {
//         expect(prompt).to.be.a('string');
//         expect(prompt.length).to.be.greaterThan(10);
//       });
//     });

//     it('should generate image URL from prompt', async function() {
//       const testPrompt = 'A serene mountain landscape at sunset';

//       const imageUrl = await generateImageFromPrompt(testPrompt);
//       expect(imageUrl).to.be.a('string');
//       expect(imageUrl.length).to.be.greaterThan(0);
//     });

//     it('should provide chatbot response', async function() {
//       const testMessage = 'Hello, how are you?';
//       const history = [];

//       const response = await chatbotReply(testMessage, history);
//       expect(response).to.be.a('string');
//       expect(response.length).to.be.greaterThan(0);
//     });
//   });

// function loadRecordings() {
//   try {
//     const recordingFiles = fs.readdirSync(recordingsDir).filter(file => file.endsWith('.json'));
//     console.log(`Found ${recordingFiles.length} recording files to load`);

//     recordingFiles.forEach(file => {
//       const filePath = path.join(recordingsDir, file);
//       let fileContent = fs.readFileSync(filePath, 'utf8');

//       // Remove leading/trailing whitespace and empty lines
//       fileContent = fileContent.trim();
//       if (fileContent.startsWith('\n')) {
//         fileContent = fileContent.substring(1);
//       }

//       console.log(`Loading recording from ${file}: ${fileContent.substring(0, 100)}...`);

//       try {
//         // Try to parse as JSON first (for array format recordings)
//         const parsed = JSON.parse(fileContent);
//         if (Array.isArray(parsed)) {
//           // If it's an array representation produced by nock.recorder,
//           // reconstruct each chunk correctly. Some recordings are encoded
//           // as objects mapping indices to single-character strings (e.g. {"0":"n","1":"o",...}).
//           const code = parsed.map(item => {
//             if (typeof item === 'string') return item;
//             const vals = Object.values(item || {});
//             // If values look like numeric char codes, convert them
//             if (vals.length > 0 && vals.every(v => typeof v === 'number' || /^\d+$/.test(String(v)))) {
//               return String.fromCharCode(...vals.map(Number));
//             }
//             // Otherwise the values are already characters, join them
//             return vals.join('');
//           }).join('\n');
//           console.log(`Parsed as JSON array, evaluating joined code...`);
//           eval(code);
//           console.log(`✅ Successfully loaded JSON array recording from ${file}`);
//         } else {
//           // If it's already nock code, eval directly
//           console.log(`Parsed as direct nock code...`);
//           eval(fileContent);
//           console.log(`✅ Successfully loaded direct nock recording from ${file}`);
//         }
//       } catch (parseError) {
//         // If JSON parsing fails, treat as direct nock code
//         console.log(`JSON parse failed (${parseError.message}), treating as direct nock code...`);
//         try {
//           eval(fileContent);
//           console.log(`✅ Successfully loaded direct nock recording from ${file}`);
//         } catch (evalError) {
//           console.log(`❌ Failed to eval recording from ${file}: ${evalError.message}`);
//           console.log(`Problematic content: ${fileContent.substring(0, 200)}`);
//         }
//       }
//     });

//     console.log(`✅ Loaded ${recordingFiles.length} recording files`);
//   } catch (error) {
//     console.log('❌ No recordings found or error loading recordings:', error.message);
//   }
// }

// function saveRecordings(recordings) {
//   if (!recordings || recordings.length === 0) return;

//   const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
//   const filename = `ai-recordings-${timestamp}.json`;
//   const filePath = path.join(recordingsDir, filename);

//   // Save the raw nock recording output
//   fs.writeFileSync(filePath, recordings.join('\n'));
//   console.log(`📼 Recordings saved to ${filename}`);
// }

// function hasRecordings() {
//   try {
//     const recordingFiles = fs.readdirSync(recordingsDir).filter(file => file.endsWith('.json'));
//     return recordingFiles.length > 0;
//   } catch (error) {
//     return false;
//   }
// }
// });