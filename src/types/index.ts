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

export interface ReviewCard extends Capture {
  state: SrsState;
  dueAt: number;
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
  lastReviewedAt: number | null;
}

