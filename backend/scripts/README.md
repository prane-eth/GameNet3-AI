# Backend scripts

This folder contains utility scripts for local development.

## create-local-users.js

Creates a set of local users in the SQLite `dev.db` used by the backend. It will:

- Truncate the `users` table
- Insert 18 local accounts (addresses copied from developer attachments)
- Write `local-accounts.json` with address/privateKey pairs to the same folder

Usage:

Run from the `backend` folder:

```bash
node scripts/create-local-users.js
```

Optional: pass a `DB_PATH` environment variable to point at a different sqlite file. Example:

```bash
DB_PATH=":memory:" node scripts/create-local-users.js
```
# Game Data Fetching Script

This script fetches game data from the Steam Web API and stores it in the local SQLite database.

## Setup

**No API key required!** The script uses public Steam API endpoints that don't require authentication.

We initially installed the `steamapi` npm package but found that it requires an API key for most operations. Instead, we use direct HTTP calls to Steam's public endpoints which work without authentication.

## Dependencies

- `node-fetch`: For making HTTP requests to Steam API
- `better-sqlite3`: Database operations

## Usage

### Fetch a specific number of games
```bash
npm run fetch-games 100
```

### Fetch default number of games (100)
```bash
npm run fetch-games
```

## What it does

- Fetches the complete Steam app list using public API endpoints
- Filters to include only games (excludes tools, SDKs, demos, etc.)
- Fetches additional details from Steam Store API for each game
- Stores game data in the local SQLite database
- Includes game details like:
  - Name, slug, release date
  - Header image, user recommendations
  - Metacritic score, platforms, genres
  - Categories and detailed descriptions

## Database Schema

The games are stored in a `games` table with the following structure:
- `id` - Steam App ID
- `name` - Game title
- `slug` - URL-friendly identifier
- `released` - Release date
- `background_image` - Game header image URL
- `rating` - Metacritic score (converted to 0-5 scale)
- `ratings_count` - Number of user recommendations
- `metacritic` - Original Metacritic score
- `platforms` - JSON array of supported platforms
- `genres` - JSON array of game genres
- `tags` - JSON array of Steam categories/tags
- `description` - Game description from Steam Store
- `updatedAt` - Last update timestamp

## API Integration

The games route (`/games`) now checks the database first before falling back to the Steam API:
- Popular games: Returns from database if available
- Search queries: Searches database first, then Steam API
- Maintains backward compatibility with existing API responses

## Rate Limiting

The script includes built-in rate limiting to respect Steam API limits:
- 200ms delay between requests
- Handles API errors gracefully
- Continues processing even if some games fail to fetch

## participate-with-keys.js

Use this script to call `participateInMint(gameId, mintId)` from multiple local private keys stored in environment variables.

Environment variables:

- `RPC_URL` - JSON-RPC URL for local node (already used by other scripts)
- `GAMING_PLATFORM_ADDRESS` - address of deployed GamingPlatform contract
- `USER_PRIVATE_KEY_1` ... `USER_PRIVATE_KEY_9` - private keys to use for participation
- `GAME_ID` - optional; if not passed as CLI arg, will be read from env
- `MINT_ID` - optional; if not passed, the script reads `getNextMint(gameId)` from the contract

Example:

```bash
GAME_ID=my-game MINT_ID=1 USER_PRIVATE_KEY_1=0xabc... USER_PRIVATE_KEY_2=0xdef... node participate-with-keys.js
```

The script will iterate through provided keys and call `participateInMint` for each, logging transaction hashes and errors.