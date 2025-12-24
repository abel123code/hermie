import { contextBridge, ipcRenderer } from 'electron';

export interface Subject {
  id: string;
  name: string;
  createdAt: number;
}

export interface CaptureResult {
  id: string;
  subjectId: string;
  imagePath: string;
  createdAt: number;
}

export interface Capture {
  id: string;
  subjectId: string;
  imagePath: string;
  createdAt: number;
}

export type SrsState = 'new' | 'learning' | 'review';
export type Rating = 'again' | 'good' | 'easy';
export type CaptureFilter = 'all' | 'due' | 'new' | 'learning' | 'review';

// Lighter capture info for Manage page listing
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

export interface CaptureSavedPayload {
  id: string;
  imagePath: string;
  expiresInMs: number;
}

contextBridge.exposeInMainWorld('hermie', {
  // Study mode
  toggleStudyMode: (): Promise<boolean> => {
    return ipcRenderer.invoke('study:toggle');
  },
  getStudyMode: (): Promise<boolean> => {
    return ipcRenderer.invoke('study:get');
  },
  
  // Capture
  capture: (subjectId: string): Promise<CaptureResult | null> => {
    return ipcRenderer.invoke('capture:take', { subjectId });
  },
  undoCapture: (id: string): Promise<{ ok: boolean }> => {
    return ipcRenderer.invoke('capture:undo', { id });
  },
  capturesLatestBySubject: (subjectId: string, limit: number): Promise<Capture[]> => {
    return ipcRenderer.invoke('captures:latestBySubject', { subjectId, limit });
  },
  
  // Subjects
  subjectsList: (): Promise<Subject[]> => {
    return ipcRenderer.invoke('subjects:list');
  },
  subjectsCreate: (name: string): Promise<Subject | { error: string }> => {
    return ipcRenderer.invoke('subjects:create', { name });
  },
  subjectsRename: (id: string, name: string): Promise<Subject | { error: string } | null> => {
    return ipcRenderer.invoke('subjects:rename', { id, name });
  },
  subjectsDelete: (id: string): Promise<{ ok: boolean; error?: string }> => {
    return ipcRenderer.invoke('subjects:delete', { id });
  },
  
  // Review / SRS
  reviewDueCount: (subjectId: string): Promise<number> => {
    return ipcRenderer.invoke('review:dueCount', { subjectId });
  },
  reviewNext: (subjectId: string): Promise<ReviewCard | null> => {
    return ipcRenderer.invoke('review:next', { subjectId });
  },
  reviewGrade: (id: string, rating: Rating): Promise<{ ok: boolean; error?: string }> => {
    return ipcRenderer.invoke('review:grade', { id, rating });
  },
  
  // Image URL
  getImageUrl: (relativePath: string): Promise<string | null> => {
    return ipcRenderer.invoke('image:getUrl', { relativePath });
  },

  // Manage Page
  manageListCaptures: (
    subjectId: string,
    filter: CaptureFilter,
    limit: number,
    offset: number
  ): Promise<CaptureListItem[]> => {
    return ipcRenderer.invoke('manage:listCaptures', { subjectId, filter, limit, offset });
  },
  manageCountCaptures: (subjectId: string): Promise<number> => {
    return ipcRenderer.invoke('manage:countCaptures', { subjectId });
  },
  manageDeleteCapture: (id: string): Promise<{ ok: boolean; error?: string }> => {
    return ipcRenderer.invoke('manage:deleteCapture', { id });
  },
  
  // Events
  onStudyModeChanged: (callback: (isOn: boolean) => void): void => {
    ipcRenderer.removeAllListeners('study:changed');
    ipcRenderer.on('study:changed', (_event, isOn: boolean) => {
      callback(isOn);
    });
  },
  onCaptureSaved: (callback: (payload: CaptureSavedPayload) => void): void => {
    ipcRenderer.removeAllListeners('capture:saved');
    ipcRenderer.on('capture:saved', (_event, payload: CaptureSavedPayload) => {
      callback(payload);
    });
  },
  onCaptureTrigger: (callback: () => void): void => {
    // Remove existing listeners to prevent duplicates
    ipcRenderer.removeAllListeners('capture:trigger');
    ipcRenderer.on('capture:trigger', () => {
      callback();
    });
  },
  onToast: (callback: (message: string) => void): void => {
    ipcRenderer.removeAllListeners('toast');
    ipcRenderer.on('toast', (_event, message: string) => {
      callback(message);
    });
  },
});
