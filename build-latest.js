const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Building AutoParts Pro with Latest Changes...');

// Step 1: Clean build directory
console.log('\n📁 Cleaning build directory...');
try {
  if (fs.existsSync('build')) {
    fs.rmSync('build', { recursive: true });
  }
  console.log('✅ Build directory cleaned');
} catch (error) {
  console.log('⚠️  Build directory clean failed:', error.message);
}

// Step 2: Build React app
console.log('\n⚛️  Building React application...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ React build completed');
} catch (error) {
  console.error('❌ React build failed:', error.message);
  process.exit(1);
}

// Step 3: Update package.json for new build directory
console.log('\n📦 Updating package.json for new build...');
const packageJson = require('./package.json');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
packageJson.build.directories.output = `dist-latest-${timestamp}`;

fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
console.log(`✅ Updated output directory to: dist-latest-${timestamp}`);

// Step 4: Package Electron app
console.log('\n🔧 Packaging Electron application...');
try {
  execSync('npm run electron-pack:win', { stdio: 'inherit' });
  console.log('✅ Electron packaging completed');
} catch (error) {
  console.error('❌ Electron packaging failed:', error.message);
  process.exit(1);
}

console.log('\n🎉 Build completed successfully!');
console.log(`📁 Output directory: dist-latest-${timestamp}`);
console.log(`📦 Installer: dist-latest-${timestamp}/AutoParts Pro Setup 1.0.0.exe`);