import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import axios from 'axios';
import { useWeb3 } from '../hooks/Web3Context';
import RatingModal from '../components/RatingModal';
import useSubmitRating from '../hooks/useSubmitRating';

interface Game {
  id: string;
  name: string;
  slug: string;
  description?: string;
  background_image?: string;
  rating?: number; // Steam rating
  released?: string;
  genres?: string; // This comes as a JSON string from backend
  metacritic?: number; // Steam metacritic score
}

interface Review {
  id: string;
  gameId: string;
  userId: string;
  rating: number; // Platform rating (1-5)
  text: string;
  createdAt: number;
}

interface GameWithReviews extends Game {
  reviews: Review[];
  platformRating: number; // Average platform rating
  reviewCount: number;
}
const backendUrl = import.meta.env.VITE_BACKEND_URL;

const Games: preact.FunctionComponent = () => {
  const { address, signer } = useWeb3();
  const [games, setGames] = useState<GameWithReviews[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingModal, setRatingModal] = useState<{
    isOpen: boolean;
    game: GameWithReviews | null;
    rating: number;
    review: string;
    error?: string;
  }>({
    isOpen: false,
    game: null,
    rating: 5,
    review: ''
  });
  const [notice, setNotice] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async (query: string = 'popular') => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/games`, {
        params: { q: query, limit: 20 }
      });
      
      // Try different ways to access the data
      let gameData: Game[] = [];
      if (response.data?.data?.results) {
        gameData = response.data.data.results;
      } else if (response.data?.results) {
        gameData = response.data.results;
      } else if (Array.isArray(response.data)) {
        gameData = response.data;
      }

      // Fetch reviews for each game and calculate platform ratings
      const gamesWithReviews: GameWithReviews[] = await Promise.all(
        gameData.map(async (game) => {
          try {
            const reviewsResponse = await axios.get(`${backendUrl}/reviews/${game.id}`);
            const reviews: Review[] = reviewsResponse.data || [];
            
            // Calculate average platform rating
            const platformRating = reviews.length > 0 
              ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
              : 0;
            
            return {
              ...game,
              reviews,
              platformRating,
              reviewCount: reviews.length
            };
          } catch (error) {
            // If reviews fail to load, return game with empty reviews
            return {
              ...game,
              reviews: [],
              platformRating: 0,
              reviewCount: 0
            };
          }
        })
      );
      
      setGames(gamesWithReviews);
    } catch (error) {
      console.error('Error fetching games:', error);
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: Event) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchGames(searchQuery);
    } else {
      fetchGames();
    }
  };

  const openRatingModal = (game: GameWithReviews) => {
    if (!address) {
      setNotice({ type: 'info', text: 'Please connect your wallet to rate games' });
      return;
    }
    setRatingModal({
      isOpen: true,
      game,
      rating: 5,
      review: ''
    });
  };

  const closeRatingModal = () => {
    setRatingModal({
      isOpen: false,
      game: null,
      rating: 5,
      review: ''
    });
  };

  // Clear notice after a short delay
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notice]);

  // Use shared hook for submitting ratings
  const { submit: submitRating } = useSubmitRating();

  const handleRatingSubmit = async (e: Event) => {
    e.preventDefault();
    if (!ratingModal.game) return;

    // Clear previous error
    setRatingModal(prev => ({ ...prev, error: undefined }));

    const { success, error } = await submitRating({
      backendUrl,
      signer,
      address,
      gameId: ratingModal.game.id,
      rating: ratingModal.rating,
      review: ratingModal.review
    } as any);

    if (!success) {
      setRatingModal(prev => ({ ...prev, error: error || 'Failed to submit rating' }));
      return;
    }

    // success
    closeRatingModal();
    fetchGames(searchQuery || 'popular');
    setNotice({ type: 'success', text: 'Rating submitted successfully!' });
  };

  const renderRating = (rating: number, type: 'steam' | 'platform', reviewCount?: number) => {
    // Convert rating to 0-5 scale for display (Steam metacritic typically 0-100 so divide by 20)
    const displayRating = (rating / 20).toFixed(1);

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

  const renderGameCard = (game: GameWithReviews) => (
    <div key={game.id} className="game-card">
      <div className="game-image" onClick={() => route(`/game/${game.id}`)}>
        <img
          src={game.background_image || 'https://via.placeholder.com/280x200?text=No+Image'}
          alt={game.name}
        />
      </div>
      <div className="game-info">
        <h3 className="game-title">{game.name.length > 25 ? game.name.substring(0, 25) + '...' : game.name}</h3>
        <div className="game-meta">
          {game.released && <span className="game-year">{new Date(game.released).getFullYear()}</span>}
          {game.genres && game.genres.length > 0 && (
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
                    // If it's not JSON, treat as comma-separated string
                    genresArray = game.genres.split(',').map(g => g.trim());
                  }
                }
                return genresArray.slice(0, 3).map((genreName: string) => (
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
            // Detect common Steam review count fields that may come from the API
            const g: any = game as any;
            const steamReviewCount = g.ratings_count || g.rating_count || g.reviews_count || g.ratings || g.reviews || g.recommendations_count || undefined;
            // Ensure numeric (some APIs return strings)
            const count = steamReviewCount !== undefined ? Number(steamReviewCount) : undefined;
            return renderRating(game.metacritic, 'steam', isNaN(count as number) ? undefined : count);
          })()}
          {game.platformRating > 0 && renderRating(game.platformRating * 20, 'platform', game.reviewCount)}
        </div>
        <div className="game-actions">
          <a href={`/game/${game.id}`} className="btn-primary">View Details</a>
          <button className="btn-secondary rate-btn" onClick={() => openRatingModal(game)}>Rate Game</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="games">
      {notice && (
        <div className={`notice-banner ${notice.type}`} role="status" onClick={() => setNotice(null)}>
          {notice.text}
        </div>
      )}
      <div className="games-header">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search games..."
            value={searchQuery}
            onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
          />
          <button type="submit">Search</button>
        </form>
      </div>

      {loading ? (
        <div className="loading">Loading games...</div>
      ) : games.length > 0 ? (
        <div className="games-grid">
          {games.map(renderGameCard)}
        </div>
      ) : (
        <div className="no-games">No games found. Try a different search.</div>
      )}

      {/* Rating Modal */}
      <RatingModal
        isOpen={ratingModal.isOpen && Boolean(ratingModal.game)}
        title={ratingModal.game ? `Rate ${ratingModal.game.name}` : 'Rate'}
        rating={ratingModal.rating}
        review={ratingModal.review}
        error={ratingModal.error}
        submitting={false}
        disabled={!ratingModal.game || !address}
        onClose={() => { setRatingModal({ isOpen: false, game: null, rating: 5, review: '' }); }}
        onRatingChange={(r) => setRatingModal(prev => ({ ...prev, rating: r }))}
        onReviewChange={(text) => setRatingModal(prev => ({ ...prev, review: text }))}
        onSubmit={handleRatingSubmit}
      />
    </div>
  );
};

export default Games;