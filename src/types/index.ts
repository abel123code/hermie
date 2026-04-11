export interface Subject {
  id: string;
  name: string;
  createdAt: number;
}

export interface Capture {
  id: string;
  subjectId: string;
  imagePath: string;
  createdAt: number;
}

export interface UndoBubble {
  id: string;
  countdown: number;
  status: 'active' | 'undone' | 'too-late';
}

// SRS types
export type SrsState = 'new' | 'learning' | 'review';
export type Rating = 'again' | 'good' | 'easy';
export type CaptureFilter = 'all' | 'due' | 'new' | 'learning' | 'review';

export interface CaptureListItem {
  id: string;
  subjectId: string;
  imagePath: string;
  createdAt: number;
  state: SrsState;
  dueAt: number;
}

export interface ReviewCard extends Capture {
  state: SrsState;
  dueAt: number;
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
  lastReviewedAt: number | null;
}

// ===== Gamification Types =====

export interface UserStats {
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
  cardsReviewedToday: number;
}

export interface LevelInfo {
  level: number;
  title: string;
  currentXp: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progress: number; // 0-1
}

export interface XPGainResult {
  xpGained: number;
  newTotalXp: number;
  leveledUp: boolean;
  newLevel: LevelInfo;
  stats: UserStats;
}

