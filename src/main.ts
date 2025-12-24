import { app, BrowserWindow, globalShortcut, ipcMain, screen, shell, clipboard } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import started from 'electron-squirrel-startup';
import { ensureBaseDirs, ensureSubjectDir, getImagesDir } from './services/storage';
import {
  initDatabase,
  closeDatabase,
  listSubjects,
  createSubject as dbCreateSubject,
  renameSubject as dbRenameSubject,
  deleteSubject as dbDeleteSubject,
  subjectExists,
  subjectNameExists,
  insertCapture,
  getLatestCapturesBySubject,
  deleteCapture,
} from './services/db';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let dashboardWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let isStudyMode = false;

const NORMAL_WIDTH = 900;
const NORMAL_HEIGHT = 650;
const OVERLAY_WIDTH = 360;  // Wide enough for pill (84px) + panel (260px) + gap
const OVERLAY_HEIGHT = 280;  // Enough for 200px pill + padding
const MARGIN = 16;
const UNDO_WINDOW_MS = 5000;

// Undo state - only most recent capture is undoable
let lastUndo: { id: string; absolutePath: string; expiresAt: number } | null = null;

function getOverlayPosition() {
  const { workArea } = screen.getPrimaryDisplay();
  return {
    x: workArea.x + workArea.width - OVERLAY_WIDTH - MARGIN,
    y: workArea.y + Math.round((workArea.height - OVERLAY_HEIGHT) / 2),
  };
}

// Get the currently active window for IPC
function getActiveWindow(): BrowserWindow | null {
  return isStudyMode ? overlayWindow : dashboardWindow;
}

function toggleStudyMode(): boolean {
  isStudyMode = !isStudyMode;

  if (isStudyMode) {
    // Switch to Study Mode: hide dashboard, show overlay
    dashboardWindow?.hide();
    if (overlayWindow) {
      const pos = getOverlayPosition();
      overlayWindow.setBounds({
        x: pos.x,
        y: pos.y,
        width: OVERLAY_WIDTH,
        height: OVERLAY_HEIGHT,
      });
      overlayWindow.show();
      overlayWindow.webContents.send('study:changed', true);
    }
  } else {
    // Exit Study Mode: hide overlay, show dashboard
    overlayWindow?.hide();
    if (dashboardWindow) {
      dashboardWindow.show();
      dashboardWindow.center();
      dashboardWindow.webContents.send('study:changed', false);
    }
  }

  return isStudyMode;
}

// Sanitize subject ID - only allow lowercase alphanumeric and hyphens
function sanitizeSubjectId(id: string): string {
  const sanitized = id.toLowerCase().trim().replace(/[^a-z0-9\-_]/g, '');
  // Fallback to inbox if empty or invalid
  if (!sanitized || !subjectExists(sanitized)) {
    return 'inbox';
  }
  return sanitized;
}

// Wait for any image in clipboard (Windows only - since shell.openExternal is fire-and-forget)
// 60 attempts * 500ms = 30 seconds max wait time for user to complete the snip
async function waitForClipboardImage(maxAttempts = 60, intervalMs = 500): Promise<Buffer> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, intervalMs));
    const img = clipboard.readImage();
    if (!img.isEmpty()) {
      return img.toPNG();
    }
  }
  throw new Error('Screenshot cancelled');
}

// Main capture flow with subject support
async function takeScreenshot(subjectId: string): Promise<{
  id: string;
  subjectId: string;
  imagePath: string;
  absolutePath: string;
  createdAt: number;
}> {
  const platform = process.platform;
  let pngBuffer: Buffer;

  // Clear clipboard first so we only capture the new screenshot
  clipboard.clear();

  if (platform === 'win32') {
    // Windows: Launch snipping tool (fire-and-forget), then poll clipboard
    try {
      await shell.openExternal('ms-screenclip:?source=QuickActions');
    } catch {
      await shell.openExternal('ms-screenclip:');
    }
    pngBuffer = await waitForClipboardImage();
  } else if (platform === 'darwin') {
    // macOS: screencapture -i -c blocks until user completes
    await new Promise<void>((resolve, reject) => {
      const child = spawn('screencapture', ['-i', '-c']);
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error('Screenshot cancelled'));
      });
      child.on('error', reject);
    });
    const img = clipboard.readImage();
    if (img.isEmpty()) {
      throw new Error('No screenshot in clipboard');
    }
    pngBuffer = img.toPNG();
  } else {
    throw new Error('Screenshot not supported on this platform');
  }

  // Generate UUID and ensure subject directory exists
  const uuid = crypto.randomUUID();
  console.log(`CAPTURE: subjectId = "${subjectId}"`);
  const subjectDir = ensureSubjectDir(subjectId);
  console.log(`CAPTURE: subjectDir = "${subjectDir}"`);
  
  // Save file
  const absolutePath = path.join(subjectDir, `${uuid}.png`);
  const relativePath = `images/${subjectId}/${uuid}.png`;
  console.log(`CAPTURE: absolutePath = "${absolutePath}"`);
  console.log(`CAPTURE: relativePath = "${relativePath}"`);
  fs.writeFileSync(absolutePath, pngBuffer);

  const createdAt = Date.now();

  // Insert into database
  try {
    insertCapture({
      id: uuid,
      subjectId,
      imagePath: relativePath,
      createdAt,
    });
    console.log(`CAPTURE: Inserted into DB with subjectId="${subjectId}"`);
  } catch (dbError) {
    console.error('DB INSERT ERROR (file saved anyway):', dbError);
    // File is saved, just log the DB error
  }

  console.log(`CAPTURE: Complete - saved to ${absolutePath}`);

  return {
    id: uuid,
    subjectId,
    imagePath: relativePath,
    absolutePath,
    createdAt,
  };
}

// Trigger capture with error handling
async function triggerCapture(subjectId: string) {
  const activeWindow = getActiveWindow();
  if (!activeWindow) return null;

  // Sanitize the subject ID
  const safeSubjectId = sanitizeSubjectId(subjectId);

  try {
    const result = await takeScreenshot(safeSubjectId);
    
    // Set up undo state
    lastUndo = {
      id: result.id,
      absolutePath: result.absolutePath,
      expiresAt: Date.now() + UNDO_WINDOW_MS,
    };

    // Send capture:saved event to renderer for the undo bubble
    activeWindow.webContents.send('capture:saved', {
      id: result.id,
      imagePath: result.imagePath,
      expiresInMs: UNDO_WINDOW_MS,
    });

    return {
      id: result.id,
      subjectId: result.subjectId,
      imagePath: result.imagePath,
      createdAt: result.createdAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to capture screenshot';
    console.error('CAPTURE ERROR:', message);
    activeWindow.webContents.send('toast', message);
    return null;
  }
}

// Handle undo request
async function handleUndoCapture(id: string): Promise<{ ok: boolean }> {
  // Check if undo is valid
  if (!lastUndo || lastUndo.id !== id || Date.now() > lastUndo.expiresAt) {
    return { ok: false };
  }

  try {
    fs.unlinkSync(lastUndo.absolutePath);
    // Also delete from database
    deleteCapture(id);
    lastUndo = null;
    return { ok: true };
  } catch (error) {
    console.error('UNDO ERROR:', error);
    return { ok: false };
  }
}

// Generate unique subject ID from name
function generateSubjectId(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-') || 'subject';
  
  // Check if exists and add suffix if needed
  const existingSubjects = listSubjects();
  const existingIds = existingSubjects.map(s => s.id);
  
  if (!existingIds.includes(base)) {
    return base;
  }
  
  let counter = 2;
  while (existingIds.includes(`${base}-${counter}`)) {
    counter++;
  }
  return `${base}-${counter}`;
}

const createWindows = () => {
  // App icon path (use .ico on Windows, .png on others)
  const iconPath = process.platform === 'win32'
    ? path.join(__dirname, '../../assets/hermie-logo.png')
    : path.join(__dirname, '../../assets/hermie-logo.png');

  // Create the main dashboard window with native frame (visible close/minimize/maximize)
  dashboardWindow = new BrowserWindow({
    width: NORMAL_WIDTH,
    height: NORMAL_HEIGHT,
    frame: true,
    titleBarStyle: 'default',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Create the overlay window (frameless, for Study Mode)
  const pos = getOverlayPosition();
  overlayWindow = new BrowserWindow({
    width: OVERLAY_WIDTH,
    height: OVERLAY_HEIGHT,
    x: pos.x,
    y: pos.y,
    transparent: true,
    frame: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false, // Hidden by default
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load the app in both windows
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    dashboardWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    overlayWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);
    dashboardWindow.loadFile(indexPath);
    overlayWindow.loadFile(indexPath);
  }

  // Handle dashboard window close
  dashboardWindow.on('closed', () => {
    dashboardWindow = null;
    overlayWindow?.close();
  });

  // Handle overlay window close
  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
};

// App ready
app.on('ready', () => {
  // Initialize database
  ensureBaseDirs();
  initDatabase();
  
  createWindows();

  // Register global shortcuts
  globalShortcut.register('Alt+S', () => {
    toggleStudyMode();
  });

  globalShortcut.register('Alt+X', () => {
    if (isStudyMode) {
      // For hotkey, we need to get the selected subject from renderer
      // For now, default to inbox - renderer will use IPC with subjectId
      overlayWindow?.webContents.send('capture:trigger');
    }
  });
});

// Unregister all shortcuts when app is about to quit
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  closeDatabase();
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindows();
  } else if (dashboardWindow && !isStudyMode) {
    dashboardWindow.show();
  }
});

// ===== IPC Handlers =====

// Study mode
ipcMain.handle('study:toggle', () => {
  return toggleStudyMode();
});

ipcMain.handle('study:get', () => {
  return isStudyMode;
});

// Capture
ipcMain.handle('capture:take', async (_event, { subjectId }: { subjectId: string }) => {
  return await triggerCapture(subjectId);
});

ipcMain.handle('capture:undo', async (_event, { id }: { id: string }) => {
  return await handleUndoCapture(id);
});

ipcMain.handle('captures:latestBySubject', (_event, { subjectId, limit }: { subjectId: string; limit: number }) => {
  return getLatestCapturesBySubject(subjectId, limit);
});

// Subjects
ipcMain.handle('subjects:list', () => {
  return listSubjects();
});

ipcMain.handle('subjects:create', (_event, { name }: { name: string }) => {
  // Check for duplicate name
  if (subjectNameExists(name)) {
    return { error: 'A subject with this name already exists' };
  }
  const id = generateSubjectId(name);
  return dbCreateSubject(id, name);
});

ipcMain.handle('subjects:rename', (_event, { id, name }: { id: string; name: string }) => {
  // Check for duplicate name (excluding current subject)
  const subjects = listSubjects();
  const duplicate = subjects.find(s => s.id !== id && s.name.toLowerCase() === name.toLowerCase());
  if (duplicate) {
    return { error: 'A subject with this name already exists' };
  }
  return dbRenameSubject(id, name);
});

ipcMain.handle('subjects:delete', (_event, { id }: { id: string }) => {
  // Don't allow deleting inbox
  if (id === 'inbox') {
    return { ok: false, error: 'Cannot delete inbox' };
  }

  try {
    // Delete image files for this subject
    const subjectImagesDir = path.join(getImagesDir(), id);
    if (fs.existsSync(subjectImagesDir)) {
      fs.rmSync(subjectImagesDir, { recursive: true, force: true });
      console.log(`DELETED: Subject images folder ${subjectImagesDir}`);
    }

    // Delete from database
    const result = dbDeleteSubject(id);
    return { ok: result };
  } catch (error) {
    console.error('Failed to delete subject:', error);
    return { ok: false, error: 'Failed to delete subject' };
  }
});
