#!/usr/bin/env node

/**
 * Reset Hermie database and images
 * Run with: node scripts/reset-db.js
 * Or add to package.json: "reset": "node scripts/reset-db.js"
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Get the app data path (same as Electron's app.getPath('userData'))
function getAppDataPath() {
  const appName = 'hermie-v1'; // Must match your app's name in package.json
  
  switch (process.platform) {
    case 'win32':
      return path.join(process.env.APPDATA || '', appName);
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Application Support', appName);
    case 'linux':
      return path.join(os.homedir(), '.config', appName);
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.rmSync(folderPath, { recursive: true, force: true });
    console.log(`  Deleted: ${folderPath}`);
    return true;
  }
  return false;
}

function deleteFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`  Deleted: ${filePath}`);
    return true;
  }
  return false;
}

function main() {
  console.log('\n🧹 Resetting Hermie database...\n');
  
  const appDataPath = getAppDataPath();
  const hermieDir = path.join(appDataPath, 'Hermie');
  const dbPath = path.join(hermieDir, 'db.sqlite');
  const dbWalPath = path.join(hermieDir, 'db.sqlite-wal');
  const dbShmPath = path.join(hermieDir, 'db.sqlite-shm');
  const imagesDir = path.join(hermieDir, 'images');
  
  console.log(`App data path: ${appDataPath}`);
  console.log(`Hermie data path: ${hermieDir}\n`);
  
  let deletedAnything = false;
  
  // Delete database files
  if (deleteFile(dbPath)) deletedAnything = true;
  if (deleteFile(dbWalPath)) deletedAnything = true;
  if (deleteFile(dbShmPath)) deletedAnything = true;
  
  // Delete images folder
  if (deleteFolderRecursive(imagesDir)) deletedAnything = true;
  
  if (deletedAnything) {
    console.log('\n✅ Reset complete! Restart the app to create a fresh database.\n');
  } else {
    console.log('\n📭 Nothing to delete - database is already clean.\n');
  }
}

main();

