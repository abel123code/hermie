import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

// Base directory for all Hermie data
const BASE_DIR = path.join(app.getPath('userData'), 'Hermie');
const IMAGES_DIR = path.join(BASE_DIR, 'images');
const DB_PATH = path.join(BASE_DIR, 'db.sqlite');

export function getBaseDir(): string {
  return BASE_DIR;
}

export function getImagesDir(): string {
  return IMAGES_DIR;
}

export function getDbPath(): string {
  return DB_PATH;
}

export function ensureBaseDirs(): void {
  if (!fs.existsSync(BASE_DIR)) {
    fs.mkdirSync(BASE_DIR, { recursive: true });
  }
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }
}

export function ensureSubjectDir(subjectId: string): string {
  const subjectDir = path.join(IMAGES_DIR, subjectId);
  if (!fs.existsSync(subjectDir)) {
    fs.mkdirSync(subjectDir, { recursive: true });
  }
  return subjectDir;
}

export function getAbsoluteImagePath(relativePath: string): string {
  return path.join(BASE_DIR, relativePath);
}

