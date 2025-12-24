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

