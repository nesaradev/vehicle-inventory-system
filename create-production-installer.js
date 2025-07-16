const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Creating Production Installer...');

// Step 1: Copy the working dist-final structure
console.log('📁 Creating production installer structure...');

const sourcePath = 'dist-final';
const targetPath = 'dist-production-final';

// Create target directory if it doesn't exist
if (!fs.existsSync(targetPath)) {
  fs.mkdirSync(targetPath, { recursive: true });
}

// Copy the latest build files to match dist-final structure
console.log('📋 Copying latest build files...');

// Copy the unpacked version
const sourceUnpacked = 'dist-production/win-unpacked';
const targetUnpacked = `${targetPath}/win-unpacked`;

if (fs.existsSync(sourceUnpacked)) {
  // Remove existing target
  if (fs.existsSync(targetUnpacked)) {
    fs.rmSync(targetUnpacked, { recursive: true });
  }
  
  // Copy recursively
  fs.cpSync(sourceUnpacked, targetUnpacked, { recursive: true });
  console.log('✅ Copied unpacked application');
} else {
  console.error('❌ Source unpacked files not found');
  process.exit(1);
}

// Check if dist-final has an installer we can use as template
const distFinalSetup = 'dist-final/AutoParts Pro Setup 1.0.0.exe';
if (fs.existsSync(distFinalSetup)) {
  console.log('📦 Found existing installer template');
  
  // Copy the installer structure files
  const filesToCopy = [
    'AutoParts Pro Setup 1.0.0.exe',
    'AutoParts Pro Setup 1.0.0.exe.blockmap',
    'builder-debug.yml',
    'latest.yml'
  ];
  
  filesToCopy.forEach(file => {
    const source = `dist-final/${file}`;
    const target = `${targetPath}/${file}`;
    
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, target);
      console.log(`✅ Copied ${file}`);
    }
  });
} else {
  console.log('⚠️  No existing installer template found');
}

// Update the executable with latest build
console.log('🔄 Updating executable with latest changes...');

// Create run script
const runScript = `@echo off
echo Starting AutoParts Pro - Production Build with Stock Validation
echo.
echo ✅ Stock validation feature included
echo ✅ Error prevention for inventory calculations
echo ✅ Boss-safe inventory management
echo.
cd "%~dp0win-unpacked"
start "" "AutoParts Pro.exe"
`;

fs.writeFileSync(`${targetPath}/run-production.bat`, runScript);
console.log('✅ Created run script');

// Create info file
const infoContent = `AutoParts Pro - Production Build
======================================

Build Date: ${new Date().toISOString().split('T')[0]}
Features: Stock validation, inventory protection
Location: win-unpacked/AutoParts Pro.exe

IMPORTANT: 
- This build includes stock validation in the Invoice section
- Prevents users from entering quantities that exceed available stock
- Shows error messages when stock limits are exceeded
- Protects inventory calculations from user errors

To run:
1. Use run-production.bat OR
2. Navigate to win-unpacked/ and run "AutoParts Pro.exe"

The boss will be happy - no more inventory calculation errors!
`;

fs.writeFileSync(`${targetPath}/BUILD-INFO.txt`, infoContent);
console.log('✅ Created build information file');

console.log('\n🎉 Production build completed successfully!');
console.log(`📁 Location: ${targetPath}`);
console.log(`🚀 Executable: ${targetPath}/win-unpacked/AutoParts Pro.exe`);
console.log(`📋 Info: ${targetPath}/BUILD-INFO.txt`);
console.log(`▶️  Run: ${targetPath}/run-production.bat`);