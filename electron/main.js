const { app, BrowserWindow, ipcMain, Notification, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const isDev = require('electron-is-dev');
const { initDatabase, getDatabase, isUsingNativeDatabase } = require('./database');
const { migrateDatabase } = require('./migrate-db');

// Set up file logging for production
let logFilePath;
try {
  const logDir = path.join(app.getPath('userData'), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  logFilePath = path.join(logDir, `autoparts-pro-${new Date().toISOString().split('T')[0]}.log`);
} catch (error) {
  // Fallback to temp directory
  logFilePath = path.join(os.tmpdir(), `autoparts-pro-${new Date().toISOString().split('T')[0]}.log`);
}

// Override console methods to also write to file
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

function writeToLogFile(level, ...args) {
  const timestamp = new Date().toISOString();
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  const logEntry = `[${timestamp}] [${level}] ${message}\n`;
  
  try {
    fs.appendFileSync(logFilePath, logEntry);
  } catch (error) {
    // Ignore file write errors to prevent infinite loops
  }
}

console.log = (...args) => {
  originalConsoleLog(...args);
  writeToLogFile('INFO', ...args);
};

console.error = (...args) => {
  originalConsoleError(...args);
  writeToLogFile('ERROR', ...args);
};

console.warn = (...args) => {
  originalConsoleWarn(...args);
  writeToLogFile('WARN', ...args);
};

console.log(`🔍 Logging to file: ${logFilePath}`);

// Catch unhandled errors and log them
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  console.error('Stack:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

let supabaseSync;
try {
  supabaseSync = require('./supabase-sync');
} catch (error) {
  console.log('Supabase sync module not available - running in offline mode');
  supabaseSync = {
    initialize: () => console.log('Supabase sync disabled'),
    getSyncStatus: () => ({ isConnected: false, isSyncing: false, lastSyncTime: null }),
    syncAll: () => Promise.resolve()
  };
}

let mainWindow;
let db;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false, // Disable web security for local files
      backgroundThrottling: false,
      disableBackgroundThrottling: true
    },
    show: false, // Don't show until ready
    icon: undefined // Explicitly set no icon to avoid cache issues
    // icon: path.join(__dirname, '../public/icon.png') // Removed - using default icon
  });

  // Show window when ready to prevent flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Create the menu template
  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Vehicle',
      submenu: [
        {
          label: 'Job Card',
          click: async () => {
            mainWindow.webContents.send('navigate', '/job-cards');
          }
        },
        {
          label: 'Estimate',
          click: async () => {
            mainWindow.webContents.send('navigate', '/estimates');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  const startUrl = isDev
    ? 'http://localhost:3001'
    : `file://${path.join(__dirname, '../index.html')}`;

  console.log('Loading URL:', startUrl);
  console.log('isDev:', isDev);
  console.log('__dirname:', __dirname);
  console.log('File exists:', require('fs').existsSync(path.join(__dirname, '../index.html')));

  mainWindow.loadURL(startUrl);

  // Open dev tools in development and allow F12 in production
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  
  // Add F12 key handler for production debugging
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
    }
  });
  
  // Add debugging info
  mainWindow.webContents.once('did-finish-load', () => {
    console.log('Window finished loading');
    mainWindow.webContents.executeJavaScript(`
      console.log('Window loaded, electronAPI available:', !!window.electronAPI);
      console.log('Location:', window.location.href);
      console.log('React root element:', document.getElementById('root'));
      console.log('ElectronAPI methods:', Object.keys(window.electronAPI || {}));
      
      // Add global debug function
      window.showDebugInfo = async () => {
        try {
          const info = await window.electronAPI.debug.getDebugInfo();
          console.log('Debug Info:', info);
          const logPath = await window.electronAPI.debug.getLogFilePath();
          console.log('Log file path:', logPath);
          alert('Debug info logged to console. Press F12 to open DevTools.\\nLog file: ' + logPath);
        } catch (error) {
          console.error('Error getting debug info:', error);
        }
      };
      
      // Add global function to open log location
      window.openLogLocation = async () => {
        try {
          await window.electronAPI.debug.openLogLocation();
        } catch (error) {
          console.error('Error opening log location:', error);
        }
      };
      
      console.log('Debug functions added: window.showDebugInfo() and window.openLogLocation()');
    `);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Fix cache permission issues on Windows
app.commandLine.appendSwitch('--disable-gpu-sandbox');
app.commandLine.appendSwitch('--disable-software-rasterizer');
app.commandLine.appendSwitch('--no-sandbox');
app.commandLine.appendSwitch('--disable-gpu');
app.commandLine.appendSwitch('--disable-dev-shm-usage');
app.commandLine.appendSwitch('--disable-extensions');
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');
app.commandLine.appendSwitch('--disable-features=VizDisplayCompositor');

app.whenReady().then(async () => {
  try {
    console.log('🚀 Initializing AutoParts Pro application...');
    db = await initDatabase();
    console.log('✅ Database initialization completed');
    
    // Run migration to update database schema
    try {
      await migrateDatabase();
      console.log('✅ Database migration completed successfully');
    } catch (error) {
      console.error('❌ Migration error:', error);
      // Continue even if migration fails
    }
  } catch (error) {
    console.error('❌ Critical error during database initialization:', error);
    // Show error dialog to user
    const { dialog } = require('electron');
    dialog.showErrorBox(
      'Database Error', 
      `Failed to initialize database: ${error.message}\n\nThe application will continue with limited functionality.`
    );
  }
  
  // Initialize Supabase sync if credentials are available
  try {
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      console.log('Initializing Supabase sync...');
      supabaseSync.initialize(supabaseUrl, supabaseKey);
    } else {
      console.log('Supabase credentials not found - running in offline mode');
    }
  } catch (error) {
    console.error('Error initializing Supabase sync:', error);
    console.log('Continuing in offline mode...');
  }
  
  createWindow();
  
  setInterval(() => {
    checkLowStock();
  }, 300000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app termination gracefully
app.on('before-quit', (event) => {
  // Close database connection if available
  if (db && typeof db.close === 'function') {
    try {
      db.close();
    } catch (error) {
      console.error('Error closing database:', error);
    }
  }
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('Received SIGINT, closing application gracefully...');
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

async function checkLowStock() {
  try {
    const db = getDatabase();
    const isNative = isUsingNativeDatabase();
    let rows = [];
    
    if (isNative) {
      if (db.prepare) {
        // better-sqlite3 style (synchronous)
        const stmt = db.prepare(`SELECT * FROM parts WHERE current_stock <= low_stock_threshold`);
        rows = stmt.all();
      } else {
        // sqlite wrapper style (asynchronous)
        rows = await db.all(`SELECT * FROM parts WHERE current_stock <= low_stock_threshold`);
      }
    } else {
      // Mock database - return empty array to avoid notifications
      console.log('Mock database: Skipping low stock check');
      return;
    }
    
    if (rows.length > 0) {
      const notification = new Notification({
        title: 'Low Stock Alert!',
        body: `${rows.length} item(s) are running low on stock`
        // icon: path.join(__dirname, '../public/icon.png') // Removed - using default icon
      });
      
      notification.show();
      
      notification.on('click', () => {
        mainWindow.webContents.send('navigate-to-low-stock');
      });
      
      // Log alerts
      const alertQuery = `INSERT INTO low_stock_alerts (part_id, current_stock, threshold, alert_sent) 
                          VALUES (?, ?, ?, 1)`;
      
      for (const part of rows) {
        try {
          // Skip if part doesn't have a valid ID
          if (!part.id) {
            console.log('Skipping low stock alert for part without ID:', part);
            continue;
          }
          
          if (db.prepare) {
            // better-sqlite3 style (synchronous)
            const alertStmt = db.prepare(alertQuery);
            alertStmt.run(part.id, part.current_stock, part.low_stock_threshold);
          } else {
            // sqlite wrapper style (asynchronous)
            await db.run(alertQuery, [part.id, part.current_stock, part.low_stock_threshold]);
          }
        } catch (err) {
          console.error('Error logging low stock alert:', err);
        }
      }
    }
  } catch (err) {
    console.error('Error checking low stock:', err);
  }
}

ipcMain.handle('db-query', async (event, { type, query, params }) => {
  try {
    const db = getDatabase();
    
    if (!db) {
      console.error('❌ Database not available');
      throw new Error('Database not initialized');
    }
    
    const isNative = isUsingNativeDatabase();
    
    // Convert INSERT to INSERT OR IGNORE for certain tables to handle duplicates gracefully
    let processedQuery = query;
    if (query.includes('INSERT INTO') && (
      query.includes('INSERT INTO parts') ||
      query.includes('INSERT INTO job_cards') ||
      query.includes('INSERT INTO estimates') ||
      query.includes('INSERT INTO invoices') ||
      query.includes('INSERT INTO low_stock_alerts')
    )) {
      // Check if this is a UNIQUE constraint sensitive table
      if (query.includes('INSERT INTO parts') && query.includes('part_number')) {
        processedQuery = query.replace('INSERT INTO', 'INSERT OR IGNORE INTO');
      } else if (query.includes('INSERT INTO job_cards') && query.includes('job_no')) {
        processedQuery = query.replace('INSERT INTO', 'INSERT OR IGNORE INTO');
      } else if (query.includes('INSERT INTO estimates') && query.includes('invoice_no')) {
        processedQuery = query.replace('INSERT INTO', 'INSERT OR IGNORE INTO');
      } else if (query.includes('INSERT INTO invoices') && query.includes('inv_no')) {
        processedQuery = query.replace('INSERT INTO', 'INSERT OR IGNORE INTO');
      } else if (query.includes('INSERT INTO low_stock_alerts')) {
        // For low stock alerts, check if similar alert exists first
        processedQuery = query.replace('INSERT INTO', 'INSERT OR IGNORE INTO');
      }
    }
    
    if (!isNative) {
      // Mock database - return appropriate mock responses
      const mockStmt = db.prepare(processedQuery);
      switch (type) {
        case 'all':
          return mockStmt.all(params || []);
        case 'get':
          return mockStmt.get(params || []);
        case 'run':
          const mockResult = mockStmt.run(params || []);
          return { 
            lastID: mockResult.lastInsertRowid, 
            changes: mockResult.changes 
          };
        default:
          throw new Error('Invalid query type');
      }
    }
    
    // Native database handling
    if (db.prepare) {
      // better-sqlite3 style (synchronous)
      const stmt = db.prepare(processedQuery);
      
      switch (type) {
        case 'all':
          return stmt.all(params || []);
        case 'get':
          return stmt.get(params || []);
        case 'run':
          const result = stmt.run(params || []);
          // Save database if using sql.js
          if (db.save && typeof db.save === 'function') {
            db.save();
          }
          return { 
            lastID: result.lastInsertRowid, 
            changes: result.changes 
          };
        default:
          throw new Error('Invalid query type');
      }
    } else {
      // sqlite wrapper style (asynchronous)
      switch (type) {
        case 'all':
          return await db.all(processedQuery, params || []);
        case 'get':
          return await db.get(processedQuery, params || []);
        case 'run':
          const result = await db.run(processedQuery, params || []);
          return { 
            lastID: result.lastID, 
            changes: result.changes 
          };
        default:
          throw new Error('Invalid query type');
      }
    }
  } catch (err) {
    console.error('Database error:', err);
    console.error('Query:', query);
    console.error('Params:', params);
    console.error('Type:', type);
    
    // For UNIQUE constraint failures, log a more helpful message
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      console.log('💡 This appears to be a duplicate entry. Consider using INSERT OR IGNORE or checking for existing data first.');
    }
    
    throw err;
  }
});

ipcMain.handle('show-notification', async (event, { title, body }) => {
  const notification = new Notification({
    title,
    body
    // icon: path.join(__dirname, '../public/icon.png') // Removed - using default icon
  });
  
  notification.show();
});

// Supabase sync handlers
ipcMain.handle('sync-status', async () => {
  return supabaseSync.getSyncStatus();
});

ipcMain.handle('trigger-sync', async () => {
  await supabaseSync.syncAll();
  return supabaseSync.getSyncStatus();
});

// Handle getting log file path
ipcMain.handle('get-log-file-path', async () => {
  return logFilePath;
});

// Handle opening log file location
ipcMain.handle('open-log-location', async () => {
  try {
    const { shell } = require('electron');
    const logDir = path.dirname(logFilePath);
    shell.openPath(logDir);
    return { success: true };
  } catch (error) {
    console.error('Error opening log location:', error);
    return { success: false, error: error.message };
  }
});

// Handle getting debug info
ipcMain.handle('get-debug-info', async () => {
  try {
    const debugInfo = {
      platform: process.platform,
      isDev: isDev,
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      chromeVersion: process.versions.chrome,
      appPath: app.getAppPath(),
      userData: app.getPath('userData'),
      logFile: logFilePath,
      databaseStatus: {
        connected: !!db,
        isNative: isUsingNativeDatabase()
      }
    };
    console.log('Debug info requested:', debugInfo);
    return debugInfo;
  } catch (error) {
    console.error('Error getting debug info:', error);
    return { error: error.message };
  }
});

// Handle saving job card image to desktop
ipcMain.handle('save-job-card-image', async (event, { imageData, jobNo }) => {
  console.log('IPC Handler called: save-job-card-image', { jobNo });
  try {
    // Get desktop path
    const desktopPath = path.join(os.homedir(), 'Desktop');
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `JobCard_${jobNo}_${timestamp}.png`;
    const filepath = path.join(desktopPath, filename);
    
    // Remove the data URL prefix if present
    const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
    
    // Save the image
    fs.writeFileSync(filepath, base64Data, 'base64');
    
    // Show success notification
    const notification = new Notification({
      title: 'Job Card Saved',
      body: `Job card image saved to Desktop as ${filename}`
    });
    notification.show();
    
    return { success: true, filepath };
  } catch (error) {
    console.error('Error saving job card image:', error);
    
    // Show error notification
    const notification = new Notification({
      title: 'Error Saving Job Card',
      body: 'Failed to save job card image to Desktop'
    });
    notification.show();
    
    return { success: false, error: error.message };
  }
});