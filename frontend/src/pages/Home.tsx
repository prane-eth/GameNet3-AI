import { useWeb3 } from '../hooks/Web3Context';

const Home: preact.FunctionComponent = () => {
  const { address, connectWallet } = useWeb3();

  const handleConnectWallet = async () => {
    await connectWallet();
  };

  return (
    <div className="home">
      <section className="hero">
        <h1>Welcome to GameNet3</h1>
        <p>The decentralized social platform for gamers</p>
        <div className="hero-actions">
          <a href="/games" className="btn-primary">Browse Games</a>
          {!address ? (
            <button className="btn-secondary" onClick={handleConnectWallet}>
              Connect Wallet
            </button>
          ) : (
            <div className="connected-status">
              {/* <span>✅ Wallet Connected</span> */}
              {/* <a href="/profile" className="btn-secondary">View Profile</a> */}
            </div>
          )}
        </div>
      </section>

      <section className="features">
        <div className="feature">
          <h3>🏆 NFT Rewards</h3>
          <p>Unique AI-generated NFTs for active users</p>
        </div>
        <div className="feature">
          <h3>🤖 AI Assistant</h3>
          <p>Get help navigating the platform and discovering new games</p>
        </div>
      </section>
    </div>
  );
};

export default Home;