import React, { useState, useEffect, useCallback } from 'react';
import { ReviewCard, Rating } from '../types';
import { XPPopup } from './XPPopup';
import { Confetti } from './Confetti';

interface ReviewScreenProps {
  subjectId: string;
  subjectName: string;
  onBack: () => void;
  onShowToast: (message: string) => void;
}

export function ReviewScreen({
  subjectId,
  subjectName,
  onBack,
  onShowToast,
}: ReviewScreenProps) {
  const [currentCard, setCurrentCard] = useState<ReviewCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGrading, setIsGrading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [dueCount, setDueCount] = useState(0);
  const [cardsReviewed, setCardsReviewed] = useState(0);
  const [totalCards, setTotalCards] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const [xpPopup, setXpPopup] = useState<{ amount: number; key: number } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const fetchNextCard = useCallback(async () => {
    setIsLoading(true);
    setImageUrl(null);
    try {
      const card = await window.hermie.reviewNext(subjectId);
      setCurrentCard(card);
      if (card) {
        const url = await window.hermie.getImageUrl(card.imagePath);
        setImageUrl(url);
        const count = await window.hermie.reviewDueCount(subjectId);
        setDueCount(count);
        if (totalCards === 0) setTotalCards(count + cardsReviewed);
      }
    } catch (error) {
      onShowToast('Failed to load card');
    } finally {
      setIsLoading(false);
    }
  }, [subjectId, onShowToast, totalCards, cardsReviewed]);

  useEffect(() => {
    const init = async () => {
      const count = await window.hermie.reviewDueCount(subjectId);
      setTotalCards(count);
      setDueCount(count);
      fetchNextCard();
    };
    init();
  }, [subjectId]);

  const handleGrade = useCallback(async (rating: Rating) => {
    if (!currentCard || isGrading) return;
    setIsGrading(true);
    try {
      const result = await window.hermie.reviewGrade(currentCard.id, rating);
      if (result.ok) {
        const xpMap: Record<Rating, number> = { again: 5, good: 10, easy: 15 };
        const xpGained = xpMap[rating];
        setSessionXp(prev => prev + xpGained);
        setXpPopup({ amount: xpGained, key: Date.now() });
        setCardsReviewed(prev => prev + 1);
        await fetchNextCard();
      } else {
        onShowToast(result.error || 'Failed to grade card');
      }
    } catch (error) {
      onShowToast('Failed to grade card');
    } finally {
      setIsGrading(false);
    }
  }, [currentCard, isGrading, fetchNextCard, onShowToast]);

  useEffect(() => {
    if (!isLoading && !currentCard && cardsReviewed > 0) setShowConfetti(true);
  }, [isLoading, currentCard, cardsReviewed]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key.toLowerCase()) {
        case 'a': handleGrade('again'); break;
        case 'g': handleGrade('good'); break;
        case 'e': handleGrade('easy'); break;
        case 'escape': onBack(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGrade, onBack]);

  const progressPercent = totalCards > 0 ? (cardsReviewed / totalCards) * 100 : 0;

  if (isLoading && !currentCard) {
    return (
      <div className="review-screen">
        <div className="review-content">
          <div className="review-loading">
            <div className="review-skeleton" />
            <span style={{ color: 'var(--ink-muted)', marginTop: '16px', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>Loading cards...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="review-screen">
        <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />
        <div className="review-content">
          <div className="review-done">
            <div className="review-done-icon">✓</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 400, color: 'var(--ink)', marginBottom: '8px' }}>
              All done
            </h2>
            <p style={{ color: 'var(--ink-secondary)', fontSize: '14px', marginBottom: '8px' }}>
              No more cards due for {subjectName}
            </p>

            {cardsReviewed > 0 && (
              <div style={{
                display: 'flex',
                gap: '24px',
                margin: '20px 0 28px',
                padding: '20px 32px',
                borderRadius: 'var(--r-lg)',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--ink)' }}>
                    {cardsReviewed}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Cards</div>
                </div>
                <div style={{ width: '1px', background: 'var(--border)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--accent)' }}>
                    +{sessionXp}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>XP earned</div>
                </div>
              </div>
            )}

            <button onClick={onBack} className="review-back-btn">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="review-screen">
      <div className="review-header">
        <button onClick={onBack} className="review-exit-btn" title="Exit (Esc)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="review-subject-badge">{subjectName}</div>

        {/* Progress */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '8px' }}>
          <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: 'var(--paper-deep)', overflow: 'hidden' }}>
            <div style={{
              width: `${progressPercent}%`,
              height: '100%',
              borderRadius: '2px',
              background: 'var(--accent)',
              transition: 'width 0.4s ease',
            }} />
          </div>
          <span style={{ fontSize: '12px', color: 'var(--ink-muted)', fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            {cardsReviewed}/{totalCards}
          </span>
        </div>

        {/* Session XP */}
        <div style={{
          padding: '4px 10px',
          borderRadius: 'var(--r-sm)',
          background: 'var(--accent-soft)',
          color: 'var(--accent)',
          fontSize: '13px',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
        }}>
          +{sessionXp} xp
        </div>
      </div>

      <div className="review-content" style={{ position: 'relative' }}>
        {xpPopup && (
          <XPPopup key={xpPopup.key} amount={xpPopup.amount} onDone={() => setXpPopup(null)} />
        )}

        <div className="review-card revealed">
          {imageUrl && (
            <img src={imageUrl} alt="Review card" className="review-image" draggable={false} />
          )}
        </div>

        <div className="review-buttons">
          <button onClick={() => handleGrade('again')} disabled={isGrading} className="review-btn review-btn-again" title="Again (A)">
            <span className="review-btn-label">Again</span>
            <span className="review-btn-hint">10m</span>
          </button>
          <button onClick={() => handleGrade('good')} disabled={isGrading} className="review-btn review-btn-good" title="Good (G)">
            <span className="review-btn-label">Good</span>
            <span className="review-btn-hint">1d</span>
          </button>
          <button onClick={() => handleGrade('easy')} disabled={isGrading} className="review-btn review-btn-easy" title="Easy (E)">
            <span className="review-btn-label">Easy</span>
            <span className="review-btn-hint">3d</span>
          </button>
        </div>

        <div className="review-hints">
          <span><kbd>A</kbd> again</span>
          <span><kbd>G</kbd> good</span>
          <span><kbd>E</kbd> easy</span>
          <span><kbd>Esc</kbd> exit</span>
        </div>
      </div>
    </div>
  );
}
