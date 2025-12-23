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

