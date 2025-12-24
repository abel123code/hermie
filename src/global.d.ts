export {};

interface Subject {
  id: string;
  name: string;
  createdAt: number;
}

interface CaptureResult {
  id: string;
  subjectId: string;
  imagePath: string;
  createdAt: number;
}

interface Capture {
  id: string;
  subjectId: string;
  imagePath: string;
  createdAt: number;
}

interface CaptureSavedPayload {
  id: string;
  imagePath: string;
  expiresInMs: number;
}

type SrsState = 'new' | 'learning' | 'review';
type Rating = 'again' | 'good' | 'easy';

interface ReviewCard extends Capture {
  state: SrsState;
  dueAt: number;
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
  lastReviewedAt: number | null;
}

declare global {
  interface Window {
    hermie: {
      // Study mode
      toggleStudyMode: () => Promise<boolean>;
      getStudyMode: () => Promise<boolean>;
      
      // Capture
      capture: (subjectId: string) => Promise<CaptureResult | null>;
      undoCapture: (id: string) => Promise<{ ok: boolean }>;
      capturesLatestBySubject: (subjectId: string, limit: number) => Promise<Capture[]>;
      
      // Subjects
      subjectsList: () => Promise<Subject[]>;
      subjectsCreate: (name: string) => Promise<Subject | { error: string }>;
      subjectsRename: (id: string, name: string) => Promise<Subject | { error: string } | null>;
      subjectsDelete: (id: string) => Promise<{ ok: boolean; error?: string }>;
      
      // Review / SRS
      reviewDueCount: (subjectId: string) => Promise<number>;
      reviewNext: (subjectId: string) => Promise<ReviewCard | null>;
      reviewGrade: (id: string, rating: Rating) => Promise<{ ok: boolean; error?: string }>;
      
      // Image URL
      getImageUrl: (relativePath: string) => Promise<string | null>;
      
      // Events
      onStudyModeChanged: (callback: (isOn: boolean) => void) => void;
      onCaptureSaved: (callback: (payload: CaptureSavedPayload) => void) => void;
      onCaptureTrigger: (callback: () => void) => void;
      onToast: (callback: (message: string) => void) => void;
    };
  }
}
