const fs = require('fs');
const path = require('path');

// Copy electron files to build directory
const sourceDir = path.join(__dirname, '..', 'electron');
const targetDir = path.join(__dirname, '..', 'build', 'electron');

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copy all electron files
const electronFiles = ['main.js', 'preload.js', 'database.js', 'migrate-db.js', 'supabase-sync.js'];

electronFiles.forEach(file => {
  const sourcePath = path.join(sourceDir, file);
  const targetPath = path.join(targetDir, file);
  
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`Copied ${file} to build directory`);
  } else {
    console.warn(`Warning: ${file} not found in electron directory`);
  }
});

console.log('Electron files copied successfully');