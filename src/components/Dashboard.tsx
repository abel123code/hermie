import React, { useState, useEffect } from 'react';
import { Subject, Capture, UserStats, LevelInfo } from '../types';
import { DeleteModal } from './DeleteModal';
import { ProgressRing } from './ProgressRing';
import hermieLogo from '../../assets/hermie-logo.png';

interface DashboardProps {
  subjects: Subject[];
  selectedSubjectId: string;
  onSelectSubject: (id: string) => void;
  onCreateSubject: (name: string) => Promise<{ ok: boolean; error?: string }>;
  onDeleteSubject: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onToggleStudyMode: () => void;
  onStartReview: (subjectId: string) => void;
  onOpenManage: () => void;
  dueCounts: Record<string, number>;
  captures: Capture[];
  toast: string | null;
  onShowToast: (message: string) => void;
  stats: UserStats;
  level: LevelInfo;
}

const DAILY_GOAL = 10;

export function Dashboard({
  subjects,
  selectedSubjectId,
  onSelectSubject,
  onCreateSubject,
  onDeleteSubject,
  onToggleStudyMode,
  onStartReview,
  onOpenManage,
  dueCounts,
  captures,
  toast,
  onShowToast,
  stats,
  level,
}: DashboardProps) {
  const [newSubjectName, setNewSubjectName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<Subject | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadUrls = async () => {
      const urls: Record<string, string> = {};
      for (const cap of captures.slice(0, 6)) {
        if (!imageUrls[cap.id]) {
          const url = await window.hermie.getImageUrl(cap.imagePath);
          if (url) urls[cap.id] = url;
        }
      }
      if (Object.keys(urls).length > 0) {
        setImageUrls(prev => ({ ...prev, ...urls }));
      }
    };
    loadUrls();
  }, [captures]);

  const handleCreate = async () => {
    const name = newSubjectName.trim();
    if (!name) return;
    setCreateError(null);
    const result = await onCreateSubject(name);
    if (result.ok) {
      setNewSubjectName('');
    } else {
      setCreateError(result.error || 'Failed to create');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate();
  };

  const handleDeleteClick = (e: React.MouseEvent, subject: Subject) => {
    e.stopPropagation();
    if (subject.id === 'inbox') return;
    setDeleteModal(subject);
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal) return;
    const result = await onDeleteSubject(deleteModal.id);
    if (!result.ok) onShowToast(result.error || 'Failed to delete');
    setDeleteModal(null);
  };

  const handleReviewClick = (e: React.MouseEvent, subjectId: string) => {
    e.stopPropagation();
    if ((dueCounts[subjectId] || 0) > 0) onStartReview(subjectId);
  };

  const totalDue = Object.values(dueCounts).reduce((a, b) => a + b, 0);
  const topDueSubject = subjects.reduce((best, s) =>
    (dueCounts[s.id] || 0) > (dueCounts[best?.id] || 0) ? s : best, subjects[0]);

  const today = new Date().toISOString().slice(0, 10);
  const streakAtRisk = stats.currentStreak > 0 && stats.lastStudyDate !== today;
  const dailyProgress = Math.min(1, stats.cardsReviewedToday / DAILY_GOAL);

  return (
    <div className="dashboard">
      {deleteModal && (
        <DeleteModal subject={deleteModal} onConfirm={handleConfirmDelete} onCancel={() => setDeleteModal(null)} />
      )}

      <div className="dashboard-content">
        {/* ─── HEADER ─── */}
        <div className="animate-enter-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src={hermieLogo}
              alt="Hermie"
              style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }}
            />
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 400, color: 'var(--ink)', margin: 0, lineHeight: 1.1 }}>
                Hermie
              </h1>
              <span style={{ fontSize: '11px', color: 'var(--ink-muted)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
                Level {level.level} · {level.title}
              </span>
            </div>
          </div>

          {/* Streak + XP compact */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {stats.currentStreak > 0 && (
              <div style={{
                display: 'flex', alignItems: 'baseline', gap: '4px',
                color: streakAtRisk ? 'var(--accent)' : 'var(--ink)',
              }}>
                <span style={{ fontSize: '20px', fontFamily: 'var(--font-display)', fontWeight: 400 }}>
                  {stats.currentStreak}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>
                  {streakAtRisk ? 'at risk' : 'streak'}
                </span>
              </div>
            )}
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: '4px',
            }}>
              <span style={{ fontSize: '20px', fontFamily: 'var(--font-display)', fontWeight: 400, color: 'var(--accent)' }}>
                {stats.totalXp.toLocaleString()}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>
                xp
              </span>
            </div>
          </div>
        </div>

        {/* ─── HERO SECTION ─── */}
        <div
          className="animate-enter-up"
          style={{
            animationDelay: '60ms',
            display: 'flex',
            gap: '16px',
            alignItems: 'stretch',
          }}
        >
          {/* Left: Daily progress + CTA */}
          <div style={{
            flex: 1,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <ProgressRing
                progress={dailyProgress}
                size={56}
                strokeWidth={5}
                color={dailyProgress >= 1 ? '#2D7A4F' : '#E8430A'}
                bgColor="var(--paper-deep)"
              >
                <span style={{ fontSize: '16px', fontFamily: 'var(--font-display)', color: dailyProgress >= 1 ? 'var(--success)' : 'var(--accent)' }}>
                  {stats.cardsReviewedToday}
                </span>
              </ProgressRing>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--ink)', lineHeight: 1.1 }}>
                  {dailyProgress >= 1 ? 'Goal reached' : `${DAILY_GOAL - stats.cardsReviewedToday} cards to go`}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink-muted)', fontWeight: 500, marginTop: '2px' }}>
                  Daily target: {DAILY_GOAL} reviews
                </div>
              </div>
            </div>

            <button
              onClick={onToggleStudyMode}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '13px 0',
                borderRadius: 'var(--r-md)',
                border: 'none',
                fontSize: '14px',
                fontWeight: 700,
                fontFamily: 'var(--font-body)',
                color: '#fff',
                background: 'var(--ink)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#2D2A26'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ink)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Start Studying
            </button>
          </div>

          {/* Right: Cards due + review */}
          <div style={{
            width: '180px',
            background: totalDue > 0 ? 'var(--accent)' : 'var(--card)',
            border: totalDue > 0 ? 'none' : '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
            padding: '24px 20px',
            boxShadow: totalDue > 0 ? 'var(--shadow-accent)' : 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.3s ease',
          }}>
            <div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '48px',
                fontWeight: 400,
                lineHeight: 1,
                color: totalDue > 0 ? '#fff' : 'var(--ink-faint)',
              }}>
                {totalDue}
              </div>
              <div style={{
                fontSize: '12px',
                fontWeight: 600,
                color: totalDue > 0 ? 'rgba(255,255,255,0.7)' : 'var(--ink-muted)',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.06em',
                marginTop: '4px',
              }}>
                Cards due
              </div>
            </div>
            {totalDue > 0 && (
              <button
                onClick={() => topDueSubject && onStartReview(topDueSubject.id)}
                style={{
                  width: '100%',
                  padding: '10px 0',
                  borderRadius: 'var(--r-sm)',
                  border: '1.5px solid rgba(255,255,255,0.35)',
                  background: 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  backdropFilter: 'blur(4px)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
              >
                Review now
              </button>
            )}
          </div>
        </div>

        {/* ─── LEVEL PROGRESS BAR ─── */}
        <div
          className="animate-enter-up"
          style={{
            animationDelay: '120ms',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
            Lv.{level.level}
          </span>
          <div style={{
            flex: 1,
            height: '4px',
            borderRadius: '2px',
            background: 'var(--paper-deep)',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${level.progress * 100}%`,
              height: '100%',
              borderRadius: '2px',
              background: 'var(--accent)',
              transition: 'width 0.6s ease',
            }} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ink-faint)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            {level.currentXp}/{level.xpForNextLevel}
          </span>
        </div>

        {/* ─── SUBJECTS ─── */}
        <div
          className="subjects-panel animate-enter-up"
          style={{ animationDelay: '180ms' }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 400, color: 'var(--ink)', margin: 0 }}>
              Subjects
            </h2>
            <button
              onClick={onOpenManage}
              style={{
                padding: '0',
                border: 'none',
                background: 'none',
                color: 'var(--ink-muted)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ink-muted)'; }}
            >
              Manage captures
            </button>
          </div>

          {/* Create input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => { setNewSubjectName(e.target.value); setCreateError(null); }}
                onKeyDown={handleKeyDown}
                placeholder="New subject name..."
                className={`subject-input ${createError ? 'error' : ''}`}
              />
              <button
                onClick={handleCreate}
                disabled={!newSubjectName.trim()}
                className="subject-add-btn"
              >
                Add
              </button>
            </div>
            {createError && <span style={{ fontSize: '12px', color: 'var(--accent)' }}>{createError}</span>}
          </div>

          {/* Subject list */}
          <div className="subject-list">
            {subjects.map((subject) => {
              const dueCount = dueCounts[subject.id] || 0;
              const isSelected = selectedSubjectId === subject.id;
              return (
                <div
                  key={subject.id}
                  onClick={() => onSelectSubject(subject.id)}
                  className={`subject-row ${isSelected ? 'selected' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Vertical accent bar instead of dot */}
                    <div style={{
                      width: '3px',
                      height: '18px',
                      borderRadius: '2px',
                      background: isSelected ? 'var(--accent)' : 'transparent',
                      transition: 'background 0.15s ease',
                      flexShrink: 0,
                    }} />
                    <span style={{
                      fontSize: '14px',
                      fontWeight: isSelected ? 600 : 500,
                      color: 'var(--ink)',
                    }}>
                      {subject.name}
                    </span>
                    {subject.id === 'inbox' && (
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        color: 'var(--ink-faint)',
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.08em',
                        border: '1px solid var(--border)',
                        padding: '1px 5px',
                        borderRadius: '3px',
                      }}>
                        Default
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {dueCount > 0 ? (
                      <button
                        onClick={(e) => handleReviewClick(e, subject.id)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 'var(--r-sm)',
                          border: 'none',
                          background: 'var(--accent)',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-hover)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}
                      >
                        {dueCount} due
                      </button>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--ink-faint)', fontWeight: 500 }}>
                        caught up
                      </span>
                    )}
                    {subject.id !== 'inbox' && (
                      <button
                        onClick={(e) => handleDeleteClick(e, subject)}
                        className="subject-delete-btn"
                        title="Delete subject"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── RECENT CAPTURES ─── */}
        <div className="captures-panel animate-enter-up" style={{ animationDelay: '240ms' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 400, color: 'var(--ink)', margin: 0 }}>
              Recent
            </h2>
            {captures.length > 0 && (
              <span style={{ fontSize: '12px', color: 'var(--ink-faint)', fontWeight: 500 }}>
                {captures.length} capture{captures.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {captures.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontStyle: 'italic', color: 'var(--ink-muted)', margin: 0 }}>
                No captures yet — press Alt+S to start
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {captures.slice(0, 6).map((capture) => (
                <div
                  key={capture.id}
                  onClick={onOpenManage}
                  style={{
                    aspectRatio: '4/3',
                    borderRadius: 'var(--r-sm)',
                    overflow: 'hidden',
                    background: 'var(--paper-warm)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: '1px solid var(--border)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  {imageUrls[capture.id] ? (
                    <img src={imageUrls[capture.id]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, var(--paper-warm) 25%, var(--paper-deep) 50%, var(--paper-warm) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── KEYBOARD HINTS ─── */}
        <div className="animate-enter-up" style={{ animationDelay: '300ms', display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <p className="hint-text">
            <kbd>Alt</kbd><span className="hint-plus">+</span><kbd>S</kbd>
            <span style={{ color: 'var(--ink-faint)', marginLeft: '4px' }}>study</span>
          </p>
          <p className="hint-text">
            <kbd>Alt</kbd><span className="hint-plus">+</span><kbd>X</kbd>
            <span style={{ color: 'var(--ink-faint)', marginLeft: '4px' }}>capture</span>
          </p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '10px 20px',
          background: 'var(--ink)',
          color: '#fff',
          borderRadius: 'var(--r-md)',
          fontSize: '13px',
          fontWeight: 600,
          boxShadow: 'var(--shadow-lg)',
          animation: 'slideUp 0.2s ease',
          zIndex: 200,
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
