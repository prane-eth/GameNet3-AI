# Game3 AI Backend (Fastify)

This repository contains a scaffolded Node.js backend using Fastify for a decentralized gaming social platform.

Features implemented in this scaffold:
- Signup/login with auto-generated anonymous nicknames (from wordlists) and placeholder AI profile picture generation stub.
- Fetch games via RAWG API (stub with caching).
- Add/view reviews with AI moderation stub.
- AI chatbot and prompt generation stubs.
- Web3 (ethers.js) integration skeleton for token/NFT minting.

Local development:

1. Copy `.env.example` to `.env` and fill values.
2. Install dependencies:

```bash
npm install
```

3. Start server:

```bash
npm run dev
```

API endpoints:
- `GET /health` - health check
- `POST /auth/signup` - signup
- `POST /auth/login` - login
- `GET /games` - fetch games
- `POST /reviews` - add review (AI-moderated)
- `GET /reviews/:gameId` - get reviews for a game
- `POST /chat` - chatbot endpoint (AI stub)
