import React from 'react';

interface StreakBadgeProps {
  streak: number;
  atRisk?: boolean;
}

export function StreakBadge({ streak, atRisk }: StreakBadgeProps) {
  if (streak === 0 && !atRisk) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '9999px',
          background: '#F0F2F8',
          color: '#B2BEC3',
          fontSize: '13px',
          fontWeight: 600,
          fontFamily: '"Fredoka", sans-serif',
        }}
      >
        <span style={{ fontSize: '16px' }}>🔥</span>
        <span>0</span>
      </div>
    );
  }

  return (
    <div
      className={streak > 0 ? 'animate-streak-pulse' : ''}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 14px',
        borderRadius: '9999px',
        background: atRisk
          ? 'linear-gradient(135deg, rgba(255,107,107,0.12), rgba(253,121,168,0.12))'
          : 'linear-gradient(135deg, rgba(255,107,107,0.1), rgba(253,203,110,0.1))',
        border: atRisk ? '1.5px solid rgba(255,107,107,0.3)' : '1.5px solid rgba(253,203,110,0.25)',
        color: atRisk ? '#FF6B6B' : '#F39C12',
        fontSize: '14px',
        fontWeight: 700,
        fontFamily: '"Fredoka", sans-serif',
      }}
    >
      <span style={{ fontSize: '18px' }}>🔥</span>
      <span>{streak}</span>
      {atRisk && (
        <span style={{ fontSize: '10px', fontWeight: 500, opacity: 0.8 }}>at risk!</span>
      )}
    </div>
  );
}
