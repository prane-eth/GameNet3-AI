import { JsonRpcProvider, Contract } from 'ethers';

const RPC = import.meta.env.VITE_RPC_URL as string;
const GAMING_PLATFORM_ADDRESS = import.meta.env.VITE_SMART_CONTRACT_ADDRESS as string;
const IPFS_GATEWAY = import.meta.env.VITE_IPFS_GATEWAY;

const gamingPlatformAbi = [
  'event NFTMinted(address indexed recipient, uint256 tokenId, string gameId, uint256 indexed mintId, string imageUrl)'
];


export async function fetchMintsFromChain(gameId: string) {
  // Connect to RPC provider
  try {
    const provider = new JsonRpcProvider(RPC);

    const contract = new Contract(
      GAMING_PLATFORM_ADDRESS,
      gamingPlatformAbi,
      provider
    );

    // The ABI declared the event as: NFTMinted(address indexed recipient, uint256 tokenId, string indexed gameId, uint256 indexed mintId, string imageUrl)
    // Query all past NFTMinted events. We'll filter by the provided gameId (string) — note some chains/indexers lowercase/utf8 handling may vary.
    const filter = contract.filters.NFTMinted();
    const events = await contract.queryFilter(filter, 0, 'latest');

    // Map events to desired return shape and filter by gameId
    const mints = events
      .map((e: any) => {
        const args = e.args || [];
        // args order from ABI: recipient, tokenId, gameId, mintId, imageUrl
        const recipient = args[0];
        const tokenId = args[1]?.toString();
        const gameId = args[2];
        const mintId = args[3]?.toString();
        const imageUrl = args[4];

        // createdAt and prompts are not part of the on-chain event — set to null
        return {
          recipient,
          tokenId,
          mintId,
          gameId,
          imageUrl,
          createdAt: null as string | null,
        };
      })
      .filter((m: any) => {
        // Some events store gameId as bytes or with extra padding — compare as string
        if (!m.gameId) return false;
        try {
          return String(m.gameId) === String(gameId);
        } catch (err) {
          return false;
        }
      })
      // sort by mintId numeric ascending
      .sort((a: any, b: any) => {
        const na = Number(a.mintId ?? a.tokenId ?? 0);
        const nb = Number(b.mintId ?? b.tokenId ?? 0);
        return na - nb;
      });

    // Convert IPFS URLs (ipfs://...) to gateway URLs if needed
    const mapImage = (url: string | null) => {
      if (!url) return null;
      if (url.startsWith('ipfs://')) {
        const path = url.replace('ipfs://', '');
        return `${IPFS_GATEWAY}/ipfs/${path}`;
      }
      return url;
    };

    return mints.map((m: any) => ({
      mintId: m.mintId,
      gameId: m.gameId,
      gameName: m.gameName,
      imageUrl: mapImage(m.imageUrl),
      prompts: m.prompts,
      createdAt: m.createdAt,
      recipient: m.recipient,
      tokenId: m.tokenId
    }));
  } catch (err) {
    // Bubble up a helpful error for the caller
    throw new Error(`fetchMintsFromChain failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}