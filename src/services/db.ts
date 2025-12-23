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
      FOREIGN KEY(subject_id) REFERENCES subjects(id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_captures_subject_id ON captures(subject_id);
    CREATE INDEX IF NOT EXISTS idx_captures_created_at ON captures(created_at);
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
    INSERT INTO captures (id, subject_id, image_path, created_at) 
    VALUES (?, ?, ?, ?)
  `).run(capture.id, capture.subjectId, capture.imagePath, capture.createdAt);
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

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

