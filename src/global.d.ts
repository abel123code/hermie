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
      
      // Events
      onStudyModeChanged: (callback: (isOn: boolean) => void) => void;
      onCaptureSaved: (callback: (payload: CaptureSavedPayload) => void) => void;
      onCaptureTrigger: (callback: () => void) => void;
      onToast: (callback: (message: string) => void) => void;
    };
  }
}
