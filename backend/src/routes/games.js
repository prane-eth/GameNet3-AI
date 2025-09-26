const fetch = require('node-fetch');

// Simple in-memory TTL cache
class SimpleCache {
  constructor(ttl = 1000 * 60 * 5) {
    this.ttl = ttl;
    this.map = new Map();
  }
  get(key) {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expire) {
      this.map.delete(key);
      return undefined;
    }
    return entry.value;
  }
  set(key, value) {
    this.map.set(key, { value, expire: Date.now() + this.ttl });
  }
  has(key) {
    return this.get(key) !== undefined;
  }
}

const cache = new SimpleCache(1000 * 60 * 5);

module.exports = async function (fastify, opts) {

  // search games
  fastify.get('/games', async (req, reply) => {
    const rawQ = String(req.query.q || '').trim();
    const limit = parseInt(req.query.limit) || 20;

    // Treat empty q or any q that contains the word 'popular' as a popularity request
    const isPopularRequest = rawQ === '' || /\bpopular\b/i.test(rawQ);

    // Check database first
    if (isPopularRequest) {
      const dbGames = fastify.db.getPopularGames(limit);
      if (dbGames.length > 0) {
        return { source: 'database', data: { results: dbGames, count: dbGames.length } };
      }
    } else {
      const dbGames = fastify.db.searchGames(rawQ, limit);
      if (dbGames.length > 0) {
        return { source: 'database', data: { results: dbGames, count: dbGames.length } };
      }
    }

    // Fallback to Steam API if no results in database
    const key = isPopularRequest ? 'games:popular' : `games:${rawQ.toLowerCase()}`;
    if (cache.has(key))
      return { source: 'cache', data: cache.get(key) };

    // // Fetch from Steam API if not found in local cache
    // const url = `https://api.steampowered.com/ISteamApps/GetAppList/v2/`;
    // const res = await fetch(url).then(r => r.json()).catch(err => ({ error: '' + err }));

    // // Filter and format Steam results to match our expected structure
    // if (res.applist?.apps) {
    //   let apps = res.applist.apps;

    //   if (!isPopularRequest) {
    //     const qLower = rawQ.toLowerCase();
    //     apps = apps.filter(app => app.name && app.name.toLowerCase().includes(qLower));
    //   }

    //   // TODO: load all attributes like background_image, rating, released, etc. from Steam API

    //   const filteredApps = apps.slice(0, limit).map(app => ({
    //     id: app.appid.toString(),
    //     name: app.name,
    //     slug: app.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    //     released: null,
    //     background_image: null,
    //     rating: null,
    //     ratings_count: 0,
    //     metacritic: null,
    //     platforms: JSON.stringify([]),
    //     genres: JSON.stringify([]),
    //     tags: JSON.stringify([]),
    //     description: '',
    //     updatedAt: Date.now()
    //   }));

    //   cache.set(key, { results: filteredApps, count: filteredApps.length });
    //   return { source: 'steam_api', data: { results: filteredApps, count: filteredApps.length } };
    // }

    // cache.set(key, res);
    // return { source: 'steam_api', data: res };
  });

  // Get specific game by ID
  fastify.get('/games/:id', async (req, reply) => {
    const { id } = req.params;

    // Try to get from database first
    const dbGame = fastify.db.getGameById(id);
    if (dbGame) {
      return dbGame;
    }

    // If not in database, try to fetch from Steam API
    try {
      const steamUrl = `https://store.steampowered.com/api/appdetails?appids=${id}&cc=us&l=en`;
      const response = await fetch(steamUrl);
      const data = await response.json();

      if (data[id] && data[id].success) {
        const gameData = data[id].data;
        const formattedGame = {
          id: id,
          name: gameData.name || 'Unknown Game',
          slug: gameData.name ? gameData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : 'unknown',
          description: gameData.short_description || gameData.detailed_description || '',
          background_image: gameData.header_image || null,
          rating: gameData.metacritic ? gameData.metacritic.score : null,
          released: gameData.release_date ? gameData.release_date.date : null,
          metacritic: gameData.metacritic ? gameData.metacritic.score : null,
          genres: JSON.stringify(gameData.genres ? gameData.genres.map(g => g.description) : []),
          platforms: JSON.stringify(gameData.platforms ? Object.keys(gameData.platforms).filter(p => gameData.platforms[p]) : [])
        };

        // Save to database for future requests
        fastify.db.createGame(formattedGame);

        return formattedGame;
      }
    } catch (error) {
      console.error('Error fetching game from Steam API:', error);
    }

    // If all else fails, return a basic game object
    return {
      id: id,
      name: 'Unknown Game',
      slug: 'unknown-game',
      description: 'Game details not available',
      background_image: null,
      rating: null,
      released: null,
      metacritic: null,
      genres: JSON.stringify([]),
      platforms: JSON.stringify([])
    };
  });

};
