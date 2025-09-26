import { useEffect } from 'preact/hooks';

interface Props {
  isOpen: boolean;
  title?: string;
  rating: number;
  review: string;
  error?: string | null;
  submitting?: boolean;
  disabled?: boolean;
  onClose: () => void;
  onRatingChange: (r: number) => void;
  onReviewChange: (text: string) => void;
  onSubmit: (e: Event) => void;
}

const RatingModal = ({ isOpen, title = 'Rate', rating, review, error, submitting, disabled, onClose, onRatingChange, onReviewChange, onSubmit }: Props) => {
  useEffect(() => {
    // lock scroll when open
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={onSubmit}>
          {error && <div className="modal-error" role="alert">{error}</div>}
          <div className="rating-input">
            <label>Rating:</label>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`star ${star <= rating ? 'active' : ''}`}
                  onClick={() => onRatingChange(star)}
                >
                  ★
                </span>
              ))}
            </div>
          </div>

          <div className="review-input">
            <label htmlFor="review">Review (optional):</label>
            <textarea
              id="review"
              value={review}
              onInput={(e) => onReviewChange((e.target as HTMLTextAreaElement).value)}
              placeholder="Share your thoughts about this game..."
              rows={4}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={disabled || submitting}>{submitting ? 'Submitting...' : 'Submit Rating'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RatingModal;
