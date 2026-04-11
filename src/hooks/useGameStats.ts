import { useState, useEffect, useCallback } from 'react';
import { UserStats, LevelInfo } from '../types';

const LEVELS = [
  { level: 1, xp: 0, title: 'Freshman' },
  { level: 2, xp: 100, title: 'Bookworm' },
  { level: 3, xp: 300, title: 'Scholar' },
  { level: 4, xp: 600, title: 'Brain' },
  { level: 5, xp: 1000, title: 'Sage' },
  { level: 6, xp: 1500, title: 'Genius' },
  { level: 7, xp: 2500, title: 'Legend' },
  { level: 8, xp: 4000, title: 'Grandmaster' },
];

export function getLevelFromXP(totalXp: number): LevelInfo {
  let current = LEVELS[0];
  let next = LEVELS[1];

  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVELS[i].xp) {
      current = LEVELS[i];
      next = LEVELS[i + 1] || LEVELS[i];
      break;
    }
  }

  const xpInLevel = totalXp - current.xp;
  const xpNeeded = next.xp - current.xp;

  return {
    level: current.level,
    title: current.title,
    currentXp: totalXp,
    xpForCurrentLevel: current.xp,
    xpForNextLevel: next.xp,
    progress: xpNeeded > 0 ? Math.min(1, xpInLevel / xpNeeded) : 1,
  };
}

const defaultStats: UserStats = {
  totalXp: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastStudyDate: null,
  cardsReviewedToday: 0,
};

export function useGameStats() {
  const [stats, setStats] = useState<UserStats>(defaultStats);
  const [level, setLevel] = useState<LevelInfo>(getLevelFromXP(0));

  const reload = useCallback(async () => {
    try {
      const s = await window.hermie.statsGet();
      setStats(s);
      setLevel(getLevelFromXP(s.totalXp));
    } catch (err) {
      console.error('Failed to load game stats:', err);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { stats, level, reload };
}
