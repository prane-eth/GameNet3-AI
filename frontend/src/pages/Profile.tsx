import { useState, useEffect } from 'preact/hooks';
import { useWeb3 } from '../hooks/Web3Context';

interface NFT {
  id: string;
  tokenId: number;
  imageUrl: string;
  metadata: string;
  createdAt: string;
}

const Profile: preact.FunctionComponent = () => {
  const { address, connectWallet, chainId } = useWeb3();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (address) {
      fetchUserNFTs();
    }
  }, [address]);

  const fetchUserNFTs = async () => {
    if (!address) return;

    try {
      setLoading(true);
      // This would integrate with the backend/smart contract to fetch NFTs
      // For now, just show placeholder
      setNfts([]);
    } catch (error) {
      console.error('Error fetching NFTs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectWallet = async () => {
    await connectWallet();
  };

  return (
    <div className="profile">
      <div className="profile-header">
        {/* <h1>My Profile</h1> */}
        {!address ? (
          <button onClick={handleConnectWallet} className="connect-wallet-btn">
            Connect Wallet
          </button>
        ) : (
          <div className="wallet-info">
            <p>Connected: {address.slice(0, 6)}...{address.slice(-4)}</p>
            <p>Network: {chainId === 1337 ? 'Local' : chainId === 11155111 ? 'Sepolia' : `Chain ${chainId}`}</p>
          </div>
        )}
      </div>

      <div className="profile-content">
        <section className="nfts-section">
          <h2>My NFTs</h2>
          {loading ? (
            <div className="loading">Loading NFTs...</div>
          ) : nfts.length > 0 ? (
            <div className="nfts-grid">
              {nfts.map((nft) => (
                <div key={nft.id} className="nft-card">
                  <img src={nft.imageUrl} alt={`NFT ${nft.tokenId}`} />
                  <div className="nft-info">
                    <p>Token ID: {nft.tokenId}</p>
                    <p>Created: {new Date(nft.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-nfts">
              <p>No NFTs found. Start playing games to earn NFTs!</p>
              {address ? (
                <p>Your wallet address: {address}</p>
              ) : null}
            </div>
          )}
        </section>

        <section className="stats-section">
          <h2>Gaming Stats</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Games Played</h3>
              <p className="stat-number">0</p>
            </div>
            <div className="stat-card">
              <h3>NFTs Earned</h3>
              <p className="stat-number">{nfts.length}</p>
            </div>
            <div className="stat-card">
              <h3>Reviews Written</h3>
              <p className="stat-number">0</p>
            </div>
            <div className="stat-card">
              <h3>Community Rank</h3>
              <p className="stat-number">-</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Profile;