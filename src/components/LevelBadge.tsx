import React from 'react';
import { LevelInfo } from '../types';

interface LevelBadgeProps {
  level: LevelInfo;
  compact?: boolean;
}

const LEVEL_COLORS: Record<number, string> = {
  1: '#B2BEC3',
  2: '#74B9FF',
  3: '#00B894',
  4: '#FDCB6E',
  5: '#6C5CE7',
  6: '#FD79A8',
  7: '#FF6B6B',
  8: '#F39C12',
};

export function LevelBadge({ level, compact }: LevelBadgeProps) {
  const color = LEVEL_COLORS[level.level] || '#6C5CE7';

  if (compact) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '9999px',
          background: `${color}18`,
          border: `1.5px solid ${color}40`,
          fontSize: '12px',
          fontWeight: 600,
          fontFamily: '"Fredoka", sans-serif',
          color,
        }}
      >
        <span style={{ fontSize: '14px' }}>⭐</span>
        Lv.{level.level}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '12px 16px',
        borderRadius: '14px',
        background: '#FFFFFF',
        border: '1px solid #E2E5F0',
        boxShadow: '0 2px 12px rgba(108, 92, 231, 0.06), 0 1px 3px rgba(0,0,0,0.04)',
        minWidth: '140px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '20px' }}>⭐</span>
        <div>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 700,
              fontFamily: '"Fredoka", sans-serif',
              color,
            }}
          >
            Level {level.level}
          </div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 500,
              color: '#636E72',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {level.title}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: '100%',
          height: '6px',
          borderRadius: '3px',
          background: '#F0F2F8',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${level.progress * 100}%`,
            height: '100%',
            borderRadius: '3px',
            background: `linear-gradient(90deg, ${color}, ${color}CC)`,
            transition: 'width 0.6s ease',
          }}
        />
      </div>
      <div
        style={{
          fontSize: '10px',
          color: '#B2BEC3',
          fontWeight: 500,
        }}
      >
        {level.currentXp} / {level.xpForNextLevel} XP
      </div>
    </div>
  );
}
