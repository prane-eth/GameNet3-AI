import { useState, useEffect } from 'preact/hooks';
import axios from 'axios';
import { ethers } from 'ethers';
import { useWeb3 } from '../hooks/Web3Context';
import RatingModal from '../components/RatingModal';
import useSubmitRating from '../hooks/useSubmitRating';
import { fetchMintsFromChain } from '../utils/web3_utils';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

interface GameDetailsProps {
  gameId: string;
}

interface Game {
  id: string;
  name: string;
  slug: string;
  description?: string;
  background_image?: string;
  rating?: number;
  released?: string;
  genres?: string;
  metacritic?: number;
}

interface Review {
  id: string;
  gameId: string;
  userId: string;
  rating: number;
  text: string;
  createdAt: number;
}

interface NFTData {
  mintedCount: number;
  nextMintId: number;
  currentApprovals: number;
  requiredApprovals: number;
  canMint: boolean;
  hasParticipated: boolean;
}

const GameDetails: preact.FunctionComponent<GameDetailsProps> = ({ gameId }) => {
  const { address, signer } = useWeb3();
  const { submit } = useSubmitRating();
  const [game, setGame] = useState<Game | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [nftData, setNftData] = useState<NFTData | null>(null);
  const [loading, setLoading] = useState(true);
  const [nftLoading, setNftLoading] = useState(true);
  const [ratingModal, setRatingModal] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newReview, setNewReview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [participating, setParticipating] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [mintModal, setMintModal] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [mintedList, setMintedList] = useState<any[]>([]);

  const truncateDescription = (htmlText: string, maxLength: number = 300) => {
    const stripped = htmlText.replace(/<[^>]*>/g, '');
    if (stripped.length <= maxLength) return htmlText;
    // Find a good break point in the HTML
    let charCount = 0;
    let result = '';
    const tagRegex = /<\/?[^>]+>/g;
    let lastIndex = 0;
    let match;

    while ((match = tagRegex.exec(htmlText)) !== null) {
      const textBeforeTag = htmlText.substring(lastIndex, match.index);
      if (charCount + textBeforeTag.length > maxLength) {
        // We've exceeded the limit, truncate here
        const remainingChars = maxLength - charCount;
        result += textBeforeTag.substring(0, remainingChars) + '...';
        break;
      }
      result += textBeforeTag + match[0];
      charCount += textBeforeTag.length;
      lastIndex = tagRegex.lastIndex;
    }

    if (result === '') {
      // No HTML tags found, simple truncation
      return stripped.substring(0, maxLength).trim() + '...';
    }

    return result.replace(/<h1/g, '<h1 style="font-size: 1.2em"');
  };

  useEffect(() => {
    if (gameId) {
      fetchGameDetails();
      fetchNFTData();
    }
  }, [gameId]);

  // Re-fetch NFT data whenever the connected address changes so hasParticipated updates
  useEffect(() => {
    if (gameId) fetchNFTData();
  }, [address, gameId]);

  // Fetch minted NFT details for the current nextMintId when available
  useEffect(() => {
    const loadMinted = async () => {
      if (!gameId) return;
      try {
        const onChain = await fetchMintsFromChain(gameId);
        const mapped = onChain.map((entry: any) => ({
          mintId: entry.mintId || `${entry.tokenId}`,
          gameId: gameId,
          imageUrl: entry.imageUrl,
          createdAt: entry.timestamp,
        }));
        setMintedList(mapped);
      } catch (err) {
        console.warn('Error fetching minted list from chain:', err);
        setMintedList([]);
      }
    };
    loadMinted();
  }, [gameId, nftData]);

  // Utility: robustly extract a usable image URL from different shapes and convert IPFS entries to gateway URLs
  const resolveImageUrl = (item: any) => {
    if (!item) return '';
    const gateway = import.meta.env.VITE_IPFS_GATEWAY;

    // If it's a plain string
    if (typeof item === 'string') {
      // support ipfs:// CID-prefixed strings
      if (item.startsWith('ipfs://')) {
        return item.replace(/^ipfs:\/\//, gateway);
      }
      // support /ipfs/<cid>/... paths
      if (item.startsWith('/ipfs/')) {
        return gateway.replace(/\/ipfs\/$/, '') + item; // fallback to attaching
      }
      return item;
    }

    // Common object shapes
    if (item.url) return resolveImageUrl(item.url);
    if (item.imageUrl) return resolveImageUrl(item.imageUrl);
    if (item.ipfs) return resolveImageUrl(item.ipfs);
    if (item.ipfsUrl) return resolveImageUrl(item.ipfsUrl);
    if (item.path) return resolveImageUrl(item.path);

    // If it's an object that looks like an IPFS object (e.g. { cid, path })
    if (item.cid && item.path) {
      // join cid and path
      const cid = item.cid;
      const path = item.path.replace(/^\//, '');
      return `${gateway}${cid}/${path}`;
    }
    if (item.cid && !item.path) {
      return `${gateway}${item.cid}`;
    }

    // Fallback: try to stringify
    try {
      const s = String(item);
      return s;
    } catch (e) {
      return '';
    }
  };

  // Lightbox state contains the selected image and its mint context
  const [displayImageItem, setDisplayImageItem] = useState<any | null>(null);
  const openLightbox = (src: string, caption: string | undefined, mintId: any,
                        mintImageIndex: number) => {
    setDisplayImageItem({ src, caption, mintId, mintImageIndex });
  };
  const closeLightbox = () => setDisplayImageItem(null);


  const fetchGameDetails = async () => {
    try {
      // Fetch game details
      const gameResponse = await axios.get(`${backendUrl}/games/${gameId}`);
      setGame(gameResponse.data);

      // Fetch reviews
      const reviewsResponse = await axios.get(`${backendUrl}/reviews/${gameId}`);
      setReviews(reviewsResponse.data || []);
    } catch (error) {
      console.error('Error fetching game details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNFTData = async () => {
    if (!gameId) {
      setNftData(null);
      setNftLoading(false);
      return;
    }

    try {
      // Contract addresses - these should come from environment variables
      const gamingPlatformAddress = import.meta.env.VITE_SMART_CONTRACT_ADDRESS;
      const gameNFTAddress = import.meta.env.VITE_NFT_CONTRACT_ADDRESS;
      const rpcUrl = import.meta.env.VITE_RPC_URL;

      if (!gamingPlatformAddress || !gameNFTAddress || !rpcUrl) {
        console.warn('Contract addresses or RPC URL not configured');
        setNftData(null);
        setNftLoading(false);
        return;
      }

      // Use JsonRpcProvider for read-only calls (works without MetaMask connection)
      const readProvider = new ethers.JsonRpcProvider(rpcUrl);

      // Create contract instances
      const gamingPlatformABI = [
        "function gameMintCount(string) view returns (uint256)",
        "function getNextMint(string) view returns (uint256)",
        "function getMintApprovals(string,uint256) view returns (uint256)",
        "function readyToMint(string,uint256) view returns (bool)",
        "function mintParticipants(string,uint256,address) view returns (bool)",
        "function REQUIRED_PARTICIPANTS() view returns (uint256)",
        "function participateInMint(string,uint256) external"
      ];

      const gamingPlatform = new ethers.Contract(gamingPlatformAddress, gamingPlatformABI, readProvider);

      // Get NFT data
      const mintedCount = await gamingPlatform.gameMintCount(gameId);
      const nextMintId = await gamingPlatform.getNextMint(gameId);
      const currentApprovals = await gamingPlatform.getMintApprovals(gameId, nextMintId);
      const canMint = await gamingPlatform.readyToMint(gameId, nextMintId);
      const requiredApprovals = await gamingPlatform.REQUIRED_PARTICIPANTS();

      let hasParticipated = false;
      try {
        hasParticipated = address ? await gamingPlatform.mintParticipants(gameId, nextMintId, address) : false;
      } catch (err) {
        console.warn('Error calling mintParticipants:', err);
        hasParticipated = false;
      }

      // Debug log: show raw values returned
      console.debug('NFT read:', { mintedCount: mintedCount.toString ? mintedCount.toString() : mintedCount, nextMintId: nextMintId.toString ? nextMintId.toString() : nextMintId, currentApprovals: currentApprovals.toString ? currentApprovals.toString() : currentApprovals, canMint, hasParticipated, requiredApprovals, address });

      setNftData({
        mintedCount: Number(mintedCount),
        nextMintId: Number(nextMintId),
        currentApprovals: Number(currentApprovals),
        requiredApprovals: Number(requiredApprovals),
        canMint,
        hasParticipated
      });
    } catch (error) {
      console.error('Error fetching NFT data:', error);
      setNftData(null);
    } finally {
      setNftLoading(false);
    }
  };

  const handleParticipateInMint = async () => {
    if (!signer || !nftData || !gameId) return;

    try {
      setParticipating(true);

      const gamingPlatformAddress = import.meta.env.VITE_SMART_CONTRACT_ADDRESS;
      const rpcUrl = import.meta.env.VITE_RPC_URL;

      if (!gamingPlatformAddress || !rpcUrl) {
        throw new Error('Smart contract address or RPC URL not configured (VITE_SMART_CONTRACT_ADDRESS / VITE_RPC_URL)');
      }

      // Ensure signer is on the same network as the read provider
      const readProvider = new ethers.JsonRpcProvider(rpcUrl);
      const readChainId = (await readProvider.getNetwork()).chainId;
      let signerChainId: number | null = null;
      try {
        const signerNetwork = await (signer as any).getChainId ? await (signer as any).getChainId() : await signer.provider.getNetwork().then(n => n.chainId);
        signerChainId = Number(signerNetwork);
      } catch (err) {
        console.warn('Unable to determine signer chainId:', err);
      }

      if (signerChainId && signerChainId !== Number(readChainId)) {
        console.error('Network mismatch: signer chainId', signerChainId, 'read provider chainId', readChainId);
        alert(`Network mismatch: your wallet is connected to chain ${signerChainId} but the app reads from chain ${readChainId}. Please switch networks in your wallet.`);
        return;
      }

      const gamingPlatformABI = [
        "function participateInMint(string,uint256) external"
      ];

      const gamingPlatform = new ethers.Contract(gamingPlatformAddress, gamingPlatformABI, signer);

      let tx;
      try {
        tx = await gamingPlatform.participateInMint(gameId, nftData.nextMintId);
      } catch (callErr: any) {
        // Often unrecognized-selector comes from calling the wrong contract address or ABI
        console.error('participateInMint call failed:', callErr);
        if (callErr?.error?.message) console.error('inner error message:', callErr.error.message);
        alert('Transaction failed to send. Possible causes: wrong contract address, wrong network, or the contract does not implement participateInMint. Check console for details.');
        return;
      }

      try {
        await tx.wait();
      } catch (waitErr) {
        console.error('Transaction reverted or failed during mining:', waitErr);
        alert('Transaction reverted. Check the contract state, required participants, or gas. See console for details.');
        return;
      }

      // Optimistically update UI to reflect that current user has participated
      try {
        setNftData(prev => prev ? { ...prev, hasParticipated: true } : prev);
      } catch (e) {
        // ignore
      }

      // Wait a bit for the node to sync the transaction
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Refresh NFT data
      await fetchNFTData();
      alert('Successfully participated in NFT minting!');
    } catch (error) {
      console.error('Error participating in mint (outer):', error);
      alert((error as any)?.message || 'Failed to participate in minting. Please try again. See console for details.');
    } finally {
      setParticipating(false);
    }
  };

  const handleMintRequest = async () => {
    if (!gameId || !nftData) return;
    if (!backendUrl) {
      alert('Backend URL not configured (VITE_BACKEND_URL)');
      return;
    }

    try {
      setIsMinting(true);
      // send gameId and optionally mintId
      const body: any = { gameId: gameId };
      if (nftData.nextMintId) body.mintId = nftData.nextMintId;

  // backend web3 routes are mounted under /web3
  const resp = await axios.post(`${backendUrl}/web3/mint-nft`, body, { timeout: 120000 });

      if (resp && resp.data) {
        console.log('Mint response:', resp.data);
        alert('Mint request completed successfully. Check backend logs for details.');
      } else {
        alert('Mint request sent. Check backend for progress.');
      }

      // Refresh NFT data after a short delay
      await new Promise(r => setTimeout(r, 2000));
      await fetchNFTData();
    } catch (err: any) {
      console.error('Error requesting mint from backend:', err);
      const msg = err?.response?.data?.error || err?.message || 'Failed to request mint';
      alert(`Mint failed: ${msg}`);
    } finally {
      setIsMinting(false);
    }
  };

  const renderRating = (rating: number, type: 'steam' | 'platform', reviewCount?: number) => {
    const displayRating = type === 'steam' ? (rating / 20).toFixed(1) : rating.toFixed(1);
    const colorClass = type === 'steam' ? 'steam-rating' : 'platform-rating';
    const icon = type === 'steam' ? '🎮' : '⭐';
    const label = type === 'steam' ? '' : 'Platform';

    return (
      <div className={`rating ${colorClass}`}>
        <span className="rating-icon">{icon}</span>
        <span className="rating-value">{displayRating}</span>
        {label && <span className="rating-label">{label}</span>}
        {reviewCount !== undefined && (
          <span className="review-count">({formatCount(reviewCount)})</span>
        )}
      </div>
    );
  };

  // Format large counts into compact strings like 3k, 5M
  const formatCount = (n: number) => {
    if (n === null || n === undefined) return '';
    const abs = Math.abs(n);
    if (abs < 1000) return String(n);
    if (abs < 1000000) return (n / 1000).toFixed(abs < 10000 ? 1 : 0).replace(/\.0$/, '') + 'k';
    if (abs < 1000000000) return (n / 1000000).toFixed(abs < 10000000 ? 1 : 0).replace(/\.0$/, '') + 'M';
    return (n / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  };

  const renderStars = (rating: number) => {
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={`star ${star <= rating ? 'active' : ''}`}>
            ★
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="loading">Loading game details...</div>;
  }

  if (!game) {
    return <div className="error">Game not found</div>;
  }

  const platformRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  return (
    <div className="game-details">
      <div style={{ marginBottom: '1rem' }}>
        <a href="/games" className="btn-secondary">← Back to Games</a>
      </div>
      <div className="game-header">
        <div className="game-image">
          <img
            src={game.background_image || 'https://via.placeholder.com/400x300?text=No+Image'}
            alt={game.name}
          />
        </div>
        <div className="game-info">
          <h1 className="game-title">{game.name}</h1>
          <div className="game-meta">
            {game.released && <span className="game-year">{new Date(game.released).getFullYear()}</span>}
            {game.genres && (
              <div className="game-genres">
                {(() => {
                  let genresArray: string[] = [];
                  if (Array.isArray(game.genres)) {
                    genresArray = game.genres;
                  } else if (typeof game.genres === 'string') {
                    try {
                      const parsed = JSON.parse(game.genres);
                      genresArray = Array.isArray(parsed) ? parsed : [game.genres];
                    } catch {
                      genresArray = game.genres.split(',').map(g => g.trim());
                    }
                  }
                  return genresArray.map((genreName: string) => (
                    <span key={genreName} className={`genre-tag genre-${genreName.toLowerCase().replace(/\s+/g, '-')}`}>
                      {genreName}
                    </span>
                  ));
                })()}
              </div>
            )}
          </div>
          <div className="ratings-container">
            {game.metacritic && (() => {
              const g: any = game as any;
              const steamReviewCount = g.ratings_count || g.rating_count || g.reviews_count || g.ratings || g.reviews || g.recommendations_count || undefined;
              const count = steamReviewCount !== undefined ? Number(steamReviewCount) : undefined;
              return renderRating(game.metacritic, 'steam', isNaN(count as number) ? undefined : count);
            })()}
            {platformRating > 0 && renderRating(platformRating, 'platform', reviews.length)}
          </div>
          <div className="game-description">
            <div className="description-content">
              {game.description ? (
                descriptionExpanded ? (
                  <div dangerouslySetInnerHTML={{ __html: game.description.replace(/<h1/g, '<h1 style="font-size: 1.2em"') }} />
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: truncateDescription(game.description) }} />
                )
              ) : 'No description available.'}
            </div>
            {game.description && game.description.replace(/<[^>]*>/g, '').length > 300 && (
              <button
                className="description-toggle"
                onClick={() => setDescriptionExpanded(!descriptionExpanded)}
              >
                {descriptionExpanded ? 'Show Less' : 'Show More'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* NFT Section */}
      <div className="nft-section">
        <h2>NFT Information</h2>
        {nftLoading ? (
          <div className="nft-loading">Loading NFT data...</div>
        ) : !address ? (
          <div className="nft-error">
            <p>Please connect your wallet to view NFT information and participate in minting.</p>
            <button className="btn-primary" onClick={() => window.location.reload()}>
              Refresh Page
            </button>
          </div>
        ) : nftData ? (
          <div className="nft-stats">
            <div className="nft-stat">
              <span className="stat-label">NFTs Minted:</span>
              <span className="stat-value">{nftData.mintedCount}</span>
            </div>
            <div className="nft-stat">
              <span className="stat-label">Next Mint ID:</span>
              <span className="stat-value">{nftData.nextMintId}</span>
            </div>
            <div className="nft-stat">
              <span className="stat-label">Current Approvals:</span>
              <span className="stat-value">{nftData.currentApprovals} / {nftData.requiredApprovals}</span>
            </div>

            <div className="nft-actions">
              {!nftData.hasParticipated ? (
                <button
                  className="btn-primary"
                  onClick={handleParticipateInMint}
                  disabled={participating || !address}
                >
                  {participating ? 'Participating...' : 'Participate in Mint'}
                </button>
              ) : (
                <span className="participated-badge">✓ Already participated</span>
              )}

              {nftData.canMint && (
                <div className="mint-ready-notice">
                  <button
                    className="btn-primary"
                    onClick={handleMintRequest}
                    disabled={isMinting}
                    title={isMinting ? 'Minting in progress' : 'Request backend to mint NFTs for top users'}
                  >
                    {isMinting ? 'Minting...' : 'Mint NFTs for Top Users'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="nft-error">
            <p>Unable to load NFT data. This might be due to:</p>
            <ul>
              <li>Network connection issues</li>
              <li>Smart contracts not properly deployed</li>
              <li>Configuration problems</li>
            </ul>
            <p>Please try refreshing the page or check the console for more details.</p>
            <button className="btn-secondary" onClick={() => window.location.reload()}>
              Refresh Page
            </button>
          </div>
        )}
        {/* Minted NFT details (if any) - render all mints */}
        {mintedList && mintedList.length > 0 && (
          (() => {
            // Flatten all images across mints into a single gallery array preserving mint context
            const flat: Array<{ src: string; caption: string; mintId: any; mintImageIndex: number }> = [];
            const reversed = mintedList.slice().reverse();
            for (let i = 0; i < reversed.length; i++) {
              const mint = reversed[i];
              flat.push({
                src: mint.imageUrl,
                caption: `Mint #${i + 1}`,
                mintId: mint.mintId,
                mintImageIndex: i,
              });
            }

            return (
              <div className="minted-gallery">
                <div className="minted-images grid">
                  {flat.length > 0 ? flat.map((it, idx) => (
                    <div key={`${it.mintId}-${it.mintImageIndex}-${idx}`}
                        className="minted-image-card"
                        onClick={() => it.src && openLightbox(it.src, it.caption, it.mintId, it.mintImageIndex)}>
                      {it.src ? (
                        <img src={it.src} alt={it.caption} />
                      ) : (
                        <div className="no-image">No image</div>
                      )}
                      <div className="minted-caption">#{idx + 1}</div>
                    </div>
                  )) : (
                    <div>No images available yet.</div>
                  )}
                </div>
              </div>
            );
          })()
        )}
      </div>

      {/* Reviews Section */}
      <div className="reviews-section">
        <div className="reviews-header">
          <h2>Reviews ({reviews.length})</h2>
          <button
            className="btn-primary"
            onClick={() => setRatingModal(true)}
            disabled={!address}
          >
            Write Review
          </button>
        </div>

        <div className="reviews-list">
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <div key={review.id} className="review-card">
                <div className="review-header">
                  <div className="review-rating">
                    {renderStars(review.rating)}
                  </div>
                  <div className="review-date">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="review-text">
                  {review.text || 'No review text provided.'}
                </div>
              </div>
            ))
          ) : (
            <div className="no-reviews">No reviews yet. Be the first to rate this game!</div>
          )}
        </div>
      </div>

      {/* Rating Modal */}
      <RatingModal
        isOpen={ratingModal}
        title={game ? `Rate ${game.name}` : 'Rate'}
        rating={newRating}
        review={newReview}
        error={submitError || undefined}
        submitting={submitting}
        disabled={!address}
        onClose={() => setRatingModal(false)}
        onRatingChange={(r) => setNewRating(r)}
        onReviewChange={(text) => setNewReview(text)}
        onSubmit={async (e: Event) => {
          e.preventDefault();
          setSubmitting(true);
          setSubmitError(null);
          const { success, error } = await submit({ backendUrl, signer, address, gameId, rating: newRating, review: newReview } as any);
          setSubmitting(false);
          if (!success) {
            setSubmitError(error || 'Failed to submit rating');
            return;
          }
          setRatingModal(false);
          // reload details and reviews
          await fetchGameDetails();
        }}
      />

      {/* Mint Modal */}
      {mintModal && (
        <div className="modal-overlay" onClick={() => setMintModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Mint NFTs for {game?.name}</h2>
              <button className="close-btn" onClick={() => setMintModal(false)}>×</button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox modal for previewing images (shows mint metadata) */}
      {displayImageItem && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={closeLightbox}>×</button>
            {displayImageItem.src ? (
              <img src={displayImageItem.src} alt={displayImageItem.caption}
                  style={{ maxWidth: '90vw', maxHeight: '80vh' }} />
            ) : (
              <div>No image</div>
            )}
            {displayImageItem.caption && <div className="lightbox-caption">{displayImageItem.caption}</div>}
            <div className="lightbox-meta" style={{ color: '#ddd', marginTop: 8, textAlign: 'center' }}>
              <div>Mint ID - Image: {displayImageItem.mintId} - {displayImageItem.mintImageIndex + 1}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameDetails;