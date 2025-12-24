import React, { useState, useEffect, useCallback } from 'react';
import { ReviewCard, Rating } from '../types';

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

  // Fetch next card
  const fetchNextCard = useCallback(async () => {
    setIsLoading(true);
    setImageUrl(null);
    
    try {
      const card = await window.hermie.reviewNext(subjectId);
      setCurrentCard(card);
      
      if (card) {
        // Get image URL
        const url = await window.hermie.getImageUrl(card.imagePath);
        setImageUrl(url);
        
        // Get remaining due count
        const count = await window.hermie.reviewDueCount(subjectId);
        setDueCount(count);
      }
    } catch (error) {
      console.error('Failed to fetch next card:', error);
      onShowToast('Failed to load card');
    } finally {
      setIsLoading(false);
    }
  }, [subjectId, onShowToast]);

  // Initial load
  useEffect(() => {
    fetchNextCard();
  }, [fetchNextCard]);

  // Handle grade
  const handleGrade = useCallback(async (rating: Rating) => {
    if (!currentCard || isGrading) return;
    
    setIsGrading(true);
    try {
      const result = await window.hermie.reviewGrade(currentCard.id, rating);
      if (result.ok) {
        await fetchNextCard();
      } else {
        onShowToast(result.error || 'Failed to grade card');
      }
    } catch (error) {
      console.error('Failed to grade card:', error);
      onShowToast('Failed to grade card');
    } finally {
      setIsGrading(false);
    }
  }, [currentCard, isGrading, fetchNextCard, onShowToast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'a':
          handleGrade('again');
          break;
        case 'g':
          handleGrade('good');
          break;
        case 'e':
          handleGrade('easy');
          break;
        case 'escape':
          onBack();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGrade, onBack]);

  // Loading state
  if (isLoading) {
    return (
      <div className="review-screen">
        <div className="review-content">
          <div className="review-loading">
            <div className="review-skeleton" />
            <span className="text-neutral-500 mt-4">Loading…</span>
          </div>
        </div>
      </div>
    );
  }

  // All done state
  if (!currentCard) {
    return (
      <div className="review-screen">
        <div className="review-content">
          <div className="review-done">
            <div className="review-done-icon">✓</div>
            <h2 className="text-xl font-semibold text-white mb-2">All done!</h2>
            <p className="text-neutral-400 text-sm mb-6">
              No more cards due for {subjectName}
            </p>
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
      {/* Header */}
      <div className="review-header">
        <button onClick={onBack} className="review-exit-btn" title="Exit (Esc)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="review-subject-badge">
          {subjectName}
        </div>
        <div className="review-count-badge">
          {dueCount} remaining
        </div>
      </div>

      {/* Card area */}
      <div className="review-content">
        <div className="review-card revealed">
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Review card"
              className="review-image"
              draggable={false}
            />
          )}
        </div>

        {/* Rating buttons */}
        <div className="review-buttons">
          <button
            onClick={() => handleGrade('again')}
            disabled={isGrading}
            className="review-btn review-btn-again"
            title="Again (A)"
          >
            <span className="review-btn-label">Again</span>
            <span className="review-btn-hint">10m</span>
          </button>
          <button
            onClick={() => handleGrade('good')}
            disabled={isGrading}
            className="review-btn review-btn-good"
            title="Good (G)"
          >
            <span className="review-btn-label">Good</span>
            <span className="review-btn-hint">1d</span>
          </button>
          <button
            onClick={() => handleGrade('easy')}
            disabled={isGrading}
            className="review-btn review-btn-easy"
            title="Easy (E)"
          >
            <span className="review-btn-label">Easy</span>
            <span className="review-btn-hint">3d</span>
          </button>
        </div>

        {/* Keyboard hints */}
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

