import { useWeb3 } from '../hooks/Web3Context';
import { useRouter } from 'preact-router';

interface HeaderProps {
  toggleDarkMode: () => void;
  isDarkMode: boolean;
}

const Header: preact.FunctionComponent<HeaderProps> = ({ toggleDarkMode, isDarkMode }) => {
  const { address, connectWallet, disconnectWallet, isConnecting, error } = useWeb3();
  const [router] = useRouter();

  const handleWalletClick = async () => {
    if (address) {
      disconnectWallet();
    } else {
      await connectWallet();
    }
  };

  const isActive = (path: string) => router.url === path;
  // consider `/game/<id>` as part of the games section so the Games nav stays highlighted
  const isGameDetail = () => {
    try {
      return /^\/game\/[\w-]+/.test(router.url || '');
    } catch (e) {
      return false;
    }
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <a href="/">
            <img src="/logo.png" alt="GameNet3-AI Logo" className="site-logo" />
          </a>
        </div>
        <nav className="nav">
          <a href="/" className={isActive('/') ? 'active' : ''}>Home</a>
          <a href="/games" className={(isActive('/games') || isGameDetail()) ? 'active' : ''}>Games</a>
          {/* <a href="/profile" className={isActive('/profile') ? 'active' : ''}>Profile</a> */}
        </nav>
        <div className="wallet-connect">
          <button
            className="connect-wallet-btn"
            onClick={handleWalletClick}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <div className="wallet-loading-spinner"></div>
                Connecting...
              </>
            ) : address ? (
              <>
                <img src="/Metamask_Logo.svg" alt="MetaMask" className="metamask-icon" />
                <span className="wallet-address">{`${address.slice(0, 6)}...${address.slice(-4)}`}</span>
              </>
            ) : (
              <>
                <img src="/Metamask_Logo.svg" alt="MetaMask" className="metamask-icon" />
                Connect Wallet
              </>
            )}
          </button>
          {error && <div className="wallet-error">{error}</div>}
        </div>
        <button className="dark-mode-toggle" onClick={toggleDarkMode}>
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
};

export default Header;