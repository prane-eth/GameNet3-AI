# GameNet3-AI Frontend

A decentralized social platform for gaming users built with Vite + Preact.

## Features

- **Web3 Integration**: Connect with MetaMask wallet
- **AI Chatbot**: Get help navigating the platform and discovering games
- **Games Browser**: Search and browse games from Steam API
- **NFT Gallery**: View your gaming NFTs
- **Responsive Design**: Works on desktop and mobile

## Tech Stack

- **Framework**: Preact (React-compatible)
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: CSS Modules
- **Web3**: ethers.js
- **Routing**: preact-router
- **HTTP Client**: axios

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:5173](http://localhost:5173) in your browser

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_BACKEND_URL=http://localhost:3000
VITE_SMART_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
VITE_NFT_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
VITE_RPC_URL=http://127.0.0.1:8545
```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components
├── hooks/         # Custom React hooks
├── utils/         # Utility functions
└── app.css        # Global styles
```

## Key Components

- **Header**: Navigation and wallet connection
- **Chatbot**: Floating AI assistant
- **Home**: Landing page with features
- **Games**: Game browser with search
- **Profile**: User profile with NFT gallery

## Web3 Integration

The app integrates with MetaMask for wallet connectivity. Users can connect their wallets to view NFTs and interact with smart contracts.

## AI Chatbot

The chatbot connects to the backend AI service to provide gaming assistance and platform navigation help.