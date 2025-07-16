# Creating Windows EXE for AutoParts Pro

Your AutoParts Pro application is ready to be packaged as a Windows executable. Due to environment limitations in WSL, here are the complete instructions to create the EXE file:

## Option 1: Use Windows Command Prompt or PowerShell (Recommended)

1. **Open Windows Command Prompt or PowerShell as Administrator**
2. **Navigate to your project directory:**
   ```cmd
   cd C:\Users\USER\Documents\vehicle-inventory-system
   ```

3. **Install dependencies (if not already done):**
   ```cmd
   npm install
   ```

4. **Build the React application:**
   ```cmd
   npm run build
   ```

5. **Create Windows executable:**
   ```cmd
   npm run electron-pack:win
   ```
   OR
   ```cmd
   npx electron-builder --win --publish never
   ```

6. **Find your executable:**
   - The executable will be created in `dist/` folder
   - Look for `AutoParts Pro Setup.exe` (installer)
   - Or `dist/win-unpacked/electron.exe` (portable version)

## Option 2: Alternative Build Commands

If the above doesn't work, try these commands one by one:

```cmd
# Clean build
npm run build

# Try direct packaging
npx electron-builder --win --dir

# Or create NSIS installer
npx electron-builder --win -p never
```

## Option 3: Manual Portable Version

If automated building fails, you can create a portable version:

1. **Copy the portable-app folder** that has been created in your project
2. **On Windows, navigate to the portable-app folder**
3. **Run the batch file:** `run-app.bat`
4. **This will install dependencies and start the app**

## Troubleshooting

### If you get SQLite3 errors:
```cmd
npm rebuild sqlite3 --runtime=electron --target=22.0.0 --dist-url=https://atom.io/download/electron
```

### If build fails with symlink errors:
```cmd
npm install --no-optional
npm run build
npx electron-builder --win --dir
```

### If you need to rebuild native dependencies:
```cmd
npx electron-rebuild -f -w sqlite3
```

## What the EXE will include:

✅ Complete AutoParts Pro application
✅ All React components and pages
✅ SQLite database functionality
✅ Inventory management
✅ Job cards system
✅ Estimates and invoicing
✅ Dark/light theme
✅ Photo storage support
✅ Offline operation
✅ Optional cloud sync (when Supabase configured)

## Distribution:

Once built, you can distribute:
- **AutoParts Pro Setup.exe** - Full installer that creates Start Menu shortcuts
- **win-unpacked folder** - Portable version that runs without installation

The executable will work on any Windows machine without requiring Node.js, npm, or any development tools to be installed.

## File Locations:

- **Installer**: `dist/AutoParts Pro Setup.exe`
- **Portable**: `dist/win-unpacked/electron.exe`
- **Database**: Will be created in user's AppData folder when app first runs

Your application is fully configured and ready for distribution!