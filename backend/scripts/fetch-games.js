#!/usr/bin/env node

const fetch = require('node-fetch');
const dbModule = require('../src/db_sqlite');
require('dotenv').config();

const BASE_URL = 'https://api.steampowered.com';

async function fetchSteamAppList() {
  console.log('Fetching Steam app list...');

  try {
    const response = await fetch(`${BASE_URL}/ISteamApps/GetAppList/v2/`);
    if (!response.ok) {
      throw new Error(`Steam API request failed: ${response.status}`);
    }
    const data = await response.json();
    return data.applist.apps;
  } catch (error) {
    console.error('Error fetching Steam app list:', error.message);
    return null;
  }
}

async function fetchSteamStoreData(appId) {
  const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data[appId.toString()]?.data || null;
  } catch (error) {
    return null;
  }
}

function transformGameData(steamApp, storeData = null, schemaData = null) {
  return {
    id: steamApp.appid.toString(),
    name: steamApp.name,
    slug: steamApp.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    released: storeData?.release_date?.date || null,
    background_image: storeData?.header_image || null,
    rating: storeData?.metacritic?.score ? storeData.metacritic.score / 20 : null, // Convert to 0-5 scale
    ratings_count: storeData?.recommendations?.total || 0,
    metacritic: storeData?.metacritic?.score || null,
    platforms: JSON.stringify(storeData?.platforms ? Object.keys(storeData.platforms).filter(p => storeData.platforms[p]) : []),
    genres: JSON.stringify(storeData?.genres?.map(g => g.description) || []),
    tags: JSON.stringify(storeData?.categories?.map(c => c.description) || []),
    description: storeData?.detailed_description || storeData?.short_description || '',
    updatedAt: Date.now()
  };
}

async function fetchAndStoreGames(db, totalGames = 500, startIndex = 0) {
  const appList = await fetchSteamAppList();

  if (!appList) {
    console.error('Failed to fetch Steam app list');
    return;
  }

  // Filter to get only games (exclude tools, demos, etc.)
  // Be more selective to get actual games
  const games = appList
    .filter(app =>
      app.name
      && !app.name.toLowerCase().includes('demo')
      && !app.name.toLowerCase().includes('sdk')
      && !app.name.toLowerCase().includes('tool')
      && !app.name.toLowerCase().includes('beta')
      && !app.name.toLowerCase().includes('server')
      && !app.name.toLowerCase().includes('client')
      && !app.name.toLowerCase().includes('winui')
      && !app.name.toLowerCase().includes('test')
      && !app.name.toLowerCase().includes('prototype')
      && !app.name.toLowerCase().includes('template')
      && !app.name.toLowerCase().includes('example')
      && !app.name.toLowerCase().includes('sample')
      && app.appid >= 10  // games typically have higher ID
    ).slice(0, totalGames);

  console.log(`Initial filtering: ${appList.length} total apps → ${games.length} potential games`);

  let storedCount = 0;
  let skippedCount = 0;

  for (let i = startIndex; i < games.length; i++) {
    const app = games[i];

    // Check if game already exists in database
    const existingGame = db.getGameById(app.appid.toString());
    if (existingGame) {
      skippedCount++;
      // Progress indicator
      if ((i + 1) % 10 === 0) {
        console.log(`Processed ${i + 1}/${games.length} games, stored ${storedCount}, skipped ${skippedCount}...`);
      }
      continue;
    }

    try {
      // Fetch additional data from Steam Store API
      const storeData = await fetchSteamStoreData(app.appid);

      if (storeData) {
        if (storeData.type === 'game') {
          const gameData = transformGameData(app, storeData);
          db.createGame(gameData);
          storedCount++;
        }
      }

      // Progress indicator
      if ((i + 1) % 10 === 0) {
        console.log(`Processed ${i + 1}/${games.length} games, stored ${storedCount}, skipped ${skippedCount}...`);
      }

    } catch (error) {
      console.error(`Error storing game ${app.name}:`, error.message);
    }

    // Rate limiting - Steam allows ~200 requests per 5 minutes
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\nCompleted! Stored ${storedCount} games, skipped ${skippedCount} existing games in the database.`);
  console.log(`Success rate: ${((storedCount / (games.length - skippedCount)) * 100).toFixed(1)}% (${storedCount}/${games.length - skippedCount})`);
}

async function main() {
  const args = process.argv.slice(2);
  const totalGames = args.length ? parseInt(args[0]) : 100;

  console.log('Initializing database...');
  const db = dbModule.init();

  const gamesCount = db.getGamesCount();
  console.log(`Current games in database: ${gamesCount}`);

  const startIndex = Math.round(gamesCount * 1.1);
  await fetchAndStoreGames(db, totalGames, startIndex);
  console.log(`Final games count: ${db.getGamesCount()}`);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}
