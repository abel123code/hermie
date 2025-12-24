import Database from 'better-sqlite3';
import { getDbPath, ensureBaseDirs } from './storage';

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

// SRS state types
export type SrsState = 'new' | 'learning' | 'review';
export type Rating = 'again' | 'good' | 'easy';

// Full capture with SRS fields for review
export interface ReviewCard extends Capture {
  state: SrsState;
  dueAt: number;
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
  lastReviewedAt: number | null;
}

// Lighter capture info for Manage page listing
export interface CaptureListItem {
  id: string;
  subjectId: string;
  imagePath: string;
  createdAt: number;
  state: SrsState;
  dueAt: number;
}

// Filter types for listing captures
export type CaptureFilter = 'all' | 'due' | 'new' | 'learning' | 'review';

// SRS scheduling constants
const AGAIN_MINUTES = 10;
const GOOD_GRAD_DAYS = 1;
const EASY_GRAD_DAYS = 3;
const MS_PER_MINUTE = 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

let db: Database.Database | null = null;

export function initDatabase(): void {
  ensureBaseDirs();
  
  const dbPath = getDbPath();
  db = new Database(dbPath);
  
  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');
  
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS captures (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      image_path TEXT NOT NULL,
      created_at INTEGER NOT NULL,

      -- SRS fields
      state TEXT NOT NULL DEFAULT 'new',
      due_at INTEGER NOT NULL DEFAULT 0,
      interval_days REAL NOT NULL DEFAULT 0,
      ease REAL NOT NULL DEFAULT 2.3,
      reps INTEGER NOT NULL DEFAULT 0,
      lapses INTEGER NOT NULL DEFAULT 0,
      last_reviewed_at INTEGER,

      FOREIGN KEY(subject_id) REFERENCES subjects(id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_captures_subject_id ON captures(subject_id);
    CREATE INDEX IF NOT EXISTS idx_captures_created_at ON captures(created_at);
    CREATE INDEX IF NOT EXISTS idx_captures_subject_due ON captures(subject_id, due_at);
  `);
  
  // Ensure inbox subject exists
  upsertInboxSubject();
}

function upsertInboxSubject(): void {
  if (!db) throw new Error('Database not initialized');
  
  const existing = db.prepare('SELECT id FROM subjects WHERE id = ?').get('inbox');
  if (!existing) {
    db.prepare('INSERT INTO subjects (id, name, created_at) VALUES (?, ?, ?)').run(
      'inbox',
      'Inbox',
      0
    );
  }
}

export function listSubjects(): Subject[] {
  if (!db) throw new Error('Database not initialized');
  
  const rows = db.prepare(`
    SELECT id, name, created_at as createdAt 
    FROM subjects 
    ORDER BY created_at ASC
  `).all() as Array<{ id: string; name: string; createdAt: number }>;
  
  return rows;
}

export function createSubject(id: string, name: string): Subject {
  if (!db) throw new Error('Database not initialized');
  
  const createdAt = Date.now();
  db.prepare('INSERT INTO subjects (id, name, created_at) VALUES (?, ?, ?)').run(
    id,
    name,
    createdAt
  );
  
  return { id, name, createdAt };
}

export function renameSubject(id: string, name: string): Subject | null {
  if (!db) throw new Error('Database not initialized');
  
  // Don't allow renaming inbox
  if (id === 'inbox') return null;
  
  db.prepare('UPDATE subjects SET name = ? WHERE id = ?').run(name, id);
  
  const row = db.prepare('SELECT id, name, created_at as createdAt FROM subjects WHERE id = ?').get(id) as { id: string; name: string; createdAt: number } | undefined;
  
  return row ? row : null;
}

export function subjectExists(id: string): boolean {
  if (!db) throw new Error('Database not initialized');
  
  const row = db.prepare('SELECT id FROM subjects WHERE id = ?').get(id);
  return !!row;
}

export function subjectNameExists(name: string): boolean {
  if (!db) throw new Error('Database not initialized');
  
  const row = db.prepare('SELECT id FROM subjects WHERE LOWER(name) = LOWER(?)').get(name);
  return !!row;
}

export function deleteSubject(id: string): { ok: boolean; error?: string } {
  if (!db) throw new Error('Database not initialized');
  
  // Don't allow deleting inbox
  if (id === 'inbox') {
    return { ok: false, error: 'Cannot delete Inbox' };
  }
  
  // Delete all captures for this subject first
  db.prepare('DELETE FROM captures WHERE subject_id = ?').run(id);
  
  // Delete the subject
  const result = db.prepare('DELETE FROM subjects WHERE id = ?').run(id);
  
  if (result.changes > 0) {
    return { ok: true };
  }
  return { ok: false, error: 'Subject not found' };
}

export function insertCapture(capture: Capture): void {
  if (!db) throw new Error('Database not initialized');
  
  db.prepare(`
    INSERT INTO captures (
      id, subject_id, image_path, created_at,
      state, due_at, interval_days, ease, reps, lapses, last_reviewed_at
    ) 
    VALUES (?, ?, ?, ?, 'new', ?, 0, 2.3, 0, 0, NULL)
  `).run(
    capture.id,
    capture.subjectId,
    capture.imagePath,
    capture.createdAt,
    capture.createdAt // due_at = createdAt (immediately due)
  );
}

export function getLatestCapturesBySubject(subjectId: string, limit: number): Capture[] {
  if (!db) throw new Error('Database not initialized');
  
  const rows = db.prepare(`
    SELECT id, subject_id as subjectId, image_path as imagePath, created_at as createdAt
    FROM captures 
    WHERE subject_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(subjectId, limit) as Capture[];
  
  return rows;
}

export function deleteCapture(id: string): boolean {
  if (!db) throw new Error('Database not initialized');
  
  const result = db.prepare('DELETE FROM captures WHERE id = ?').run(id);
  return result.changes > 0;
}

// ===== SRS Functions =====

export function getDueCount(subjectId: string, now: number): number {
  if (!db) throw new Error('Database not initialized');
  
  const row = db.prepare(`
    SELECT COUNT(*) as count
    FROM captures
    WHERE subject_id = ?
      AND due_at <= ?
  `).get(subjectId, now) as { count: number };
  
  return row.count;
}

export function getNextDueCapture(subjectId: string, now: number): ReviewCard | null {
  if (!db) throw new Error('Database not initialized');
  
  const row = db.prepare(`
    SELECT
      id,
      subject_id as subjectId,
      image_path as imagePath,
      created_at as createdAt,
      state,
      due_at as dueAt,
      interval_days as intervalDays,
      ease,
      reps,
      lapses,
      last_reviewed_at as lastReviewedAt
    FROM captures
    WHERE subject_id = ?
      AND due_at <= ?
    ORDER BY due_at ASC, created_at ASC
    LIMIT 1
  `).get(subjectId, now) as ReviewCard | undefined;
  
  return row ?? null;
}

export function gradeCapture(
  id: string,
  rating: Rating,
  now: number
): { ok: boolean; error?: string } {
  if (!db) throw new Error('Database not initialized');
  
  // Fetch current card
  const card = db.prepare(`
    SELECT
      state,
      interval_days as intervalDays,
      ease,
      reps,
      lapses
    FROM captures
    WHERE id = ?
  `).get(id) as {
    state: SrsState;
    intervalDays: number;
    ease: number;
    reps: number;
    lapses: number;
  } | undefined;
  
  if (!card) {
    return { ok: false, error: 'Card not found' };
  }
  
  let newState: SrsState = card.state;
  let newDueAt: number;
  let newIntervalDays: number = card.intervalDays;
  let newEase: number = card.ease;
  let newReps: number = card.reps;
  let newLapses: number = card.lapses;
  
  switch (rating) {
    case 'again':
      newState = 'learning';
      newDueAt = now + AGAIN_MINUTES * MS_PER_MINUTE;
      newEase = Math.max(1.3, card.ease - 0.2);
      newIntervalDays = 0;
      newReps = 0;
      newLapses = card.lapses + 1;
      break;
      
    case 'good':
      if (card.state === 'new' || card.state === 'learning') {
        // Graduating from new/learning
        newState = 'review';
        newIntervalDays = GOOD_GRAD_DAYS;
        newDueAt = now + GOOD_GRAD_DAYS * MS_PER_DAY;
        newEase = Math.min(2.8, card.ease + 0.05);
      } else {
        // Already in review
        newIntervalDays = Math.max(1, card.intervalDays * card.ease);
        newDueAt = now + newIntervalDays * MS_PER_DAY;
        newEase = Math.min(2.8, card.ease + 0.02);
      }
      newReps = card.reps + 1;
      break;
      
    case 'easy':
      if (card.state === 'new' || card.state === 'learning') {
        // Graduating from new/learning with easy bonus
        newState = 'review';
        newIntervalDays = EASY_GRAD_DAYS;
        newDueAt = now + EASY_GRAD_DAYS * MS_PER_DAY;
        newEase = Math.min(2.8, card.ease + 0.15);
      } else {
        // Already in review - apply easy multiplier
        newIntervalDays = Math.max(1, card.intervalDays * card.ease * 1.3);
        newDueAt = now + newIntervalDays * MS_PER_DAY;
        newEase = Math.min(2.8, card.ease + 0.1);
      }
      newReps = card.reps + 1;
      break;
  }
  
  // Update the card
  db.prepare(`
    UPDATE captures
    SET
      state = ?,
      due_at = ?,
      interval_days = ?,
      ease = ?,
      reps = ?,
      lapses = ?,
      last_reviewed_at = ?
    WHERE id = ?
  `).run(
    newState,
    Math.round(newDueAt),
    newIntervalDays,
    newEase,
    newReps,
    newLapses,
    now,
    id
  );
  
  return { ok: true };
}

// ===== Manage Page Functions =====

export function listCapturesBySubject(
  subjectId: string,
  filter: CaptureFilter,
  limit: number,
  offset: number,
  now: number
): CaptureListItem[] {
  if (!db) throw new Error('Database not initialized');

  let whereClause: string;
  const params: (string | number)[] = [subjectId];

  switch (filter) {
    case 'due':
      whereClause = 'subject_id = ? AND due_at <= ?';
      params.push(now);
      break;
    case 'new':
      whereClause = "subject_id = ? AND state = 'new'";
      break;
    case 'learning':
      whereClause = "subject_id = ? AND state = 'learning'";
      break;
    case 'review':
      whereClause = "subject_id = ? AND state = 'review'";
      break;
    case 'all':
    default:
      whereClause = 'subject_id = ?';
      break;
  }

  const rows = db.prepare(`
    SELECT
      id,
      subject_id as subjectId,
      image_path as imagePath,
      created_at as createdAt,
      state,
      due_at as dueAt
    FROM captures
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as CaptureListItem[];

  return rows;
}

export function countCapturesBySubject(subjectId: string): number {
  if (!db) throw new Error('Database not initialized');

  const row = db.prepare(`
    SELECT COUNT(*) as count
    FROM captures
    WHERE subject_id = ?
  `).get(subjectId) as { count: number };

  return row.count;
}

export function getCaptureById(id: string): { imagePath: string } | null {
  if (!db) throw new Error('Database not initialized');

  const row = db.prepare(`
    SELECT image_path as imagePath
    FROM captures
    WHERE id = ?
  `).get(id) as { imagePath: string } | undefined;

  return row ?? null;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

