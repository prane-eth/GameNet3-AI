// Auto-participates by voting for NFT minting using multiple accounts

require('dotenv').config();
const { ethers } = require('ethers');
const { getProvider } = require('../src/utils/web3');

// Script to call participateInMint(gameId, mintId) using multiple private keys
// Reads USER_PRIVATE_KEY_1 ... USER_PRIVATE_KEY_10 from environment

const GAMING_PLATFORM_ABI = [
    "function getNextMint(string) external view returns (uint256)",
    "function participateInMint(string, uint256) external",
    "function readyToMint(string, uint256) external view returns (bool)",
    "function getMintApprovals(string, uint256) external view returns (uint256)",
    "function mintParticipants(string, uint256, address) external view returns (bool)",
    "function REQUIRED_PARTICIPANTS() external view returns (uint256)"
];

async function main() {
    const provider = getProvider();
    const contractAddress = process.env.GAMING_PLATFORM_ADDRESS;
    if (!contractAddress) throw new Error('GAMING_PLATFORM_ADDRESS not set in env');

    const gameId = process.argv[2] || '10';
    console.log(`Using gameId = ${gameId}`);

    const readOnlyContract = new ethers.Contract(contractAddress, GAMING_PLATFORM_ABI, provider);

    let mintId = null;
    console.log('Reading next mint id from contract (will fallback to 1 on error)...');
    try {
        mintId = await readOnlyContract.getNextMint(gameId);
        mintId = Number(mintId.toString());
        console.log(`Using nextMintId = ${mintId}`);
    } catch (e) {
        console.warn('Could not read nextMintId from contract, falling back to default mintId = 1:', e.message);
        mintId = 1;
    }

    // Collect private keys from env
    const keys = [];
    for (let i = 1; i <= 9; i++) {
        const key = process.env[`USER_PRIVATE_KEY_${i}`];
        if (key && key.length > 0) keys.push({ key, id: i });
    }

    if (keys.length === 0) {
        console.error('No USER_PRIVATE_KEY_1..9 found in environment');
        process.exit(1);
    }

    console.log(`Found ${keys.length} private keys, will call participateInMint for each`);

    // Iterate sequentially to avoid nonce collisions and to make logs clear
    for (const entry of keys) {
        const pk = entry.key.trim();
        try {
            const wallet = new ethers.Wallet(pk, provider);
            const contract = new ethers.Contract(contractAddress, GAMING_PLATFORM_ABI, wallet);

            console.log(`\n==> (${entry.id}) Participating with ${wallet.address}`);

            // Optional: skip if already participated
            try {
                const already = await readOnlyContract.mintParticipants(gameId, mintId, wallet.address);
                if (already) {
                    console.log(`- Wallet ${wallet.address} already participated, skipping`);
                    continue;
                }
            } catch (e) {
                // If mintParticipants read fails, continue to attempt participation
                console.warn('- Could not read mintParticipants for address, continuing to attempt participate:', e.message);
            }

            const tx = await contract.participateInMint(gameId, mintId, { gasLimit: 200000 });
            console.log(`- Sent tx ${tx.hash}, waiting for confirmation...`);
            const receipt = await tx.wait();
            console.log(`- ✅ Participated (tx ${receipt.transactionHash}) - block ${receipt.blockNumber}`);
        } catch (err) {
            console.error(`- ❌ Failed to participate for key ${entry.id}:`, err.message || err);
        }
    }

    console.log('\nAll done');
}

if (require.main === module) {
    main().catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}

module.exports = { main };
