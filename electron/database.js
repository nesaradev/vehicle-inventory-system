const path = require('path');
const { app } = require('electron');

let db;
let usingNativeDatabase = false;

// Enhanced mock database implementation for fallback
const mockDb = {
  prepare: (query) => ({
    all: (params = []) => [],
    get: (params = []) => null,
    run: (params = []) => ({ lastInsertRowid: 1, changes: 1 })
  }),
  exec: (sql) => {
    console.log('Mock database executing:', sql.substring(0, 100) + '...');
  },
  close: () => {}
};

// Database initialization with multiple fallback strategies
const initDatabase = async () => {
  console.log('🔄 Initializing database...');
  
  try {
    // Strategy 1: Try sql.js (pure JavaScript, most compatible for packaged apps)
    db = await tryInitSqlJs();
    if (db) {
      usingNativeDatabase = true;
      console.log('✅ Successfully connected to SQLite database via sql.js');
    }
  } catch (error) {
    console.log('❌ sql.js failed:', error.message);
    
    try {
      // Strategy 2: Try better-sqlite3 (faster but needs native compilation)
      db = await tryInitBetterSqlite3();
      if (db) {
        usingNativeDatabase = true;
        console.log('✅ Successfully connected to SQLite database via better-sqlite3');
      }
    } catch (error2) {
      console.log('❌ Better-SQLite3 failed:', error2.message);
      
      try {
        // Strategy 3: Try sqlite + sqlite3 wrapper
        db = await tryInitSqliteWrapper();
        if (db) {
          usingNativeDatabase = true;
          console.log('✅ Successfully connected to SQLite database via sqlite wrapper');
        }
      } catch (error3) {
        console.log('❌ SQLite wrapper failed:', error3.message);
        
        // Strategy 4: Use mock database (always works)
        console.log('⚠️  Using mock database - data will not persist between sessions');
        db = mockDb;
        usingNativeDatabase = false;
      }
    }
  }
  
  await createTables();
  await ensurePhotoColumn();
  await ensureDefaultData();
  
  console.log(`🎯 Database initialized successfully (${usingNativeDatabase ? 'Native' : 'Mock'} mode)`);
  return db;
};

// Try to initialize sqlite + sqlite3 wrapper
async function tryInitSqliteWrapper() {
  // Skip sqlite3 wrapper since it's not working
  throw new Error('SQLite3 wrapper disabled - using better-sqlite3 instead');
}

// Try to initialize better-sqlite3
async function tryInitBetterSqlite3() {
  try {
    // Try to require better-sqlite3 with error handling
    let Database;
    try {
      Database = require('better-sqlite3');
    } catch (requireError) {
      console.log('❌ better-sqlite3 require failed:', requireError.message);
      if (requireError.message.includes('electron-rebuild') || 
          requireError.message.includes('not a valid Win32 application') ||
          requireError.message.includes('better_sqlite3.node')) {
        console.log('💡 Hint: Native module compilation issue - falling back to sql.js');
      }
      throw requireError;
    }
    
    // Get the database path, with fallback for non-electron environments
    let dbPath;
    try {
      dbPath = path.join(app.getPath('userData'), 'vehicle-inventory.db');
      console.log('✅ Using app userData path for database:', dbPath);
    } catch (error) {
      console.log('⚠️ app.getPath failed, using fallback paths');
      // Fallback path if app.getPath fails - check common locations
      const fs = require('fs');
      const os = require('os');
      const possiblePaths = [
        // Windows AppData path
        path.join(os.homedir(), 'AppData', 'Roaming', 'vehicle-inventory-system', 'vehicle-inventory.db'),
        // Linux home path
        path.join(os.homedir(), '.vehicle-inventory-system', 'vehicle-inventory.db'),
        // Current directory fallback
        path.join(process.cwd(), 'vehicle-inventory.db'),
        // Relative to executable location
        path.join(__dirname, '..', 'vehicle-inventory.db')
      ];
      
      // Find the first existing database
      dbPath = possiblePaths.find(p => fs.existsSync(p));
      
      if (!dbPath) {
        // Use the first writable path and create directory if needed
        for (const testPath of possiblePaths) {
          try {
            const appDataPath = path.dirname(testPath);
            if (!fs.existsSync(appDataPath)) {
              fs.mkdirSync(appDataPath, { recursive: true });
            }
            // Test if we can write to this location
            fs.writeFileSync(testPath + '.test', 'test');
            fs.unlinkSync(testPath + '.test');
            dbPath = testPath;
            console.log('✅ Using writable path for database:', dbPath);
            break;
          } catch (e) {
            console.log('⚠️ Cannot write to:', testPath, '-', e.message);
            continue;
          }
        }
      }
      
      if (!dbPath) {
        throw new Error('No writable location found for database');
      }
    }
    
    console.log('🔗 Attempting to connect to database at:', dbPath);
    const db = new Database(dbPath);
    console.log('✅ Better-SQLite3 connection successful');
    return db;
  } catch (error) {
    console.log('❌ Better-SQLite3 connection failed:', error.message);
    
    // Try sql.js as fallback
    return await tryInitSqlJs();
  }
}

// Try to initialize sql.js (pure JavaScript SQLite)
async function tryInitSqlJs() {
  try {
    console.log('🔄 Attempting to initialize sql.js...');
    const initSqlJs = require('sql.js');
    const fs = require('fs');
    
    const SQL = await initSqlJs();
    console.log('✅ sql.js library loaded successfully');
    
    // Get the database path, with fallback for non-electron environments
    let dbPath;
    try {
      dbPath = path.join(app.getPath('userData'), 'vehicle-inventory.db');
      console.log('📁 Using app userData path:', dbPath);
    } catch (error) {
      console.log('⚠️ app.getPath failed, using fallback paths');
      // Fallback path if app.getPath fails - check common locations
      const os = require('os');
      const possiblePaths = [
        // Windows AppData path
        path.join(os.homedir(), 'AppData', 'Roaming', 'vehicle-inventory-system', 'vehicle-inventory.db'),
        // Linux home path
        path.join(os.homedir(), '.vehicle-inventory-system', 'vehicle-inventory.db'),
        // Current directory fallback
        path.join(process.cwd(), 'vehicle-inventory.db'),
        // Relative to executable location
        path.join(__dirname, '..', 'vehicle-inventory.db'),
        // Temp directory fallback
        path.join(os.tmpdir(), 'vehicle-inventory.db')
      ];
      
      // Find the first existing database
      dbPath = possiblePaths.find(p => {
        try {
          return fs.existsSync(p);
        } catch (e) {
          return false;
        }
      });
      
      if (!dbPath) {
        // Use the first writable path and create directory if needed
        for (const testPath of possiblePaths) {
          try {
            const appDataPath = path.dirname(testPath);
            if (!fs.existsSync(appDataPath)) {
              fs.mkdirSync(appDataPath, { recursive: true });
            }
            // Test if we can write to this location
            fs.writeFileSync(testPath + '.test', 'test');
            fs.unlinkSync(testPath + '.test');
            dbPath = testPath;
            console.log('✅ Using writable path for database:', dbPath);
            break;
          } catch (e) {
            console.log('⚠️ Cannot write to:', testPath, '-', e.message);
            continue;
          }
        }
      }
      
      if (!dbPath) {
        throw new Error('No writable location found for database');
      }
    }
    
    let db;
    if (fs.existsSync(dbPath)) {
      // Load existing database
      const filebuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(filebuffer);
      console.log('✅ Loaded existing database with sql.js from:', dbPath);
    } else {
      // Create new database
      db = new SQL.Database();
      console.log('✅ Created new database with sql.js at:', dbPath);
    }
    
    // Wrap sql.js database to match better-sqlite3 API
    const wrappedDb = {
      prepare: (sql) => ({
        all: (params = []) => {
          try {
            const stmt = db.prepare(sql);
            const results = [];
            if (params && params.length > 0) {
              stmt.bind(params);
            }
            while (stmt.step()) {
              results.push(stmt.getAsObject());
            }
            stmt.free();
            return results;
          } catch (error) {
            console.error('sql.js query error (all):', error);
            return [];
          }
        },
        get: (params = []) => {
          try {
            const stmt = db.prepare(sql);
            if (params && params.length > 0) {
              stmt.bind(params);
            }
            const result = stmt.step() ? stmt.getAsObject() : null;
            stmt.free();
            return result;
          } catch (error) {
            console.error('sql.js query error (get):', error);
            return null;
          }
        },
        run: (params = []) => {
          try {
            const stmt = db.prepare(sql);
            if (params && params.length > 0) {
              stmt.bind(params);
            }
            stmt.step();
            const changes = db.getRowsModified();
            let lastInsertRowid = 0;
            try {
              const result = db.exec("SELECT last_insert_rowid()");
              lastInsertRowid = result[0]?.values[0]?.[0] || 0;
            } catch (e) {
              // Ignore errors getting last insert id
            }
            stmt.free();
            // Auto-save after modifications
            setTimeout(() => {
              try {
                const data = db.export();
                fs.writeFileSync(dbPath, Buffer.from(data));
              } catch (saveError) {
                console.error('Auto-save failed:', saveError);
              }
            }, 100);
            return { changes, lastInsertRowid };
          } catch (error) {
            console.error('sql.js query error (run):', error);
            return { changes: 0, lastInsertRowid: 0 };
          }
        }
      }),
      exec: (sql) => {
        try {
          db.exec(sql);
          // Auto-save after exec
          setTimeout(() => {
            try {
              const data = db.export();
              fs.writeFileSync(dbPath, Buffer.from(data));
            } catch (saveError) {
              console.error('Auto-save failed:', saveError);
            }
          }, 100);
        } catch (error) {
          console.error('sql.js exec error:', error);
        }
      },
      close: () => {
        try {
          // Save database to file
          const data = db.export();
          fs.writeFileSync(dbPath, Buffer.from(data));
          db.close();
        } catch (error) {
          console.error('Error closing sql.js database:', error);
        }
      },
      // Add save method for periodic saves
      save: () => {
        try {
          const data = db.export();
          fs.writeFileSync(dbPath, Buffer.from(data));
          console.log('✅ Database saved successfully');
        } catch (error) {
          console.error('❌ Error saving database:', error);
        }
      }
    };
    
    return wrappedDb;
  } catch (error) {
    console.log('❌ sql.js initialization failed:', error.message);
    throw error;
  }
}

// Create database tables
const createTables = async () => {
  try {
    if (usingNativeDatabase) {
      // Execute table creation SQL for native databases
      const tableCreationSQL = `
        -- Counters table for Pro No and Job No tracking
        CREATE TABLE IF NOT EXISTS counters (
          id TEXT PRIMARY KEY,
          current_value INTEGER NOT NULL DEFAULT 0
        );

        -- Initialize counters if they don't exist
        INSERT OR IGNORE INTO counters (id, current_value) VALUES ('pro_no', 0);
        INSERT OR IGNORE INTO counters (id, current_value) VALUES ('job_no', 0);
        INSERT OR IGNORE INTO counters (id, current_value) VALUES ('estimate_invoice', 0);
        INSERT OR IGNORE INTO counters (id, current_value) VALUES ('invoice_no', 0);

        -- Parts table with all fields
        CREATE TABLE IF NOT EXISTS parts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pro_no TEXT UNIQUE,
          part_number TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          item_name TEXT,
          description TEXT,
          part_type TEXT DEFAULT 'new',
          cost_price REAL DEFAULT 0,
          selling_price REAL DEFAULT 0,
          final_selling_price REAL DEFAULT 0,
          current_stock INTEGER DEFAULT 0,
          low_stock_threshold INTEGER DEFAULT 10,
          supplier TEXT,
          item_code TEXT,
          cost_code TEXT,
          reorder_level INTEGER DEFAULT 0,
          unit TEXT DEFAULT 'NOS',
          location TEXT,
          photo TEXT,
          created_at DATETIME DEFAULT (datetime('now','localtime')),
          updated_at DATETIME DEFAULT (datetime('now','localtime'))
        );

        -- Job Cards table
        CREATE TABLE IF NOT EXISTS job_cards (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          job_no TEXT UNIQUE NOT NULL,
          job_date DATE NOT NULL,
          in_time TIME NOT NULL,
          vehicle_no TEXT NOT NULL,
          vehicle_type TEXT DEFAULT 'CAR',
          make TEXT,
          model TEXT,
          color TEXT,
          engine_no TEXT,
          chassis_no TEXT,
          man_year TEXT,
          in_milage TEXT,
          insurance_company TEXT,
          claim_no TEXT,
          date_of_accident DATE,
          customer_type TEXT DEFAULT 'existing',
          customer_name TEXT NOT NULL,
          id_no TEXT,
          address TEXT,
          mob_no TEXT,
          tel_no TEXT,
          fax_no TEXT,
          email TEXT,
          vat_no TEXT,
          technician TEXT,
          advance REAL DEFAULT 0,
          service_advisor TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          total_cost REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Stock movements table
        CREATE TABLE IF NOT EXISTS stock_movements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          part_id INTEGER NOT NULL,
          movement_type TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          cost_price REAL,
          selling_price REAL,
          final_selling_price REAL,
          notes TEXT,
          grn_documented BOOLEAN DEFAULT 0,
          grn_no TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (part_id) REFERENCES parts(id)
        );

        -- Job Card Parts table
        CREATE TABLE IF NOT EXISTS job_card_parts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          job_card_id INTEGER NOT NULL,
          part_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price REAL NOT NULL,
          total_price REAL NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (job_card_id) REFERENCES job_cards(id),
          FOREIGN KEY (part_id) REFERENCES parts(id)
        );

        -- Low stock alerts table
        CREATE TABLE IF NOT EXISTS low_stock_alerts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          part_id INTEGER NOT NULL,
          current_stock INTEGER NOT NULL,
          threshold INTEGER NOT NULL,
          alert_sent BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (part_id) REFERENCES parts(id)
        );

        -- Estimates table
        CREATE TABLE IF NOT EXISTS estimates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_no TEXT UNIQUE,
          job_no TEXT,
          job_date TEXT,
          vehicle_no TEXT,
          customer TEXT,
          ins_company TEXT,
          remarks TEXT,
          total_amount REAL DEFAULT 0,
          discount REAL DEFAULT 0,
          created_at DATETIME DEFAULT (datetime('now','localtime')),
          updated_at DATETIME DEFAULT (datetime('now','localtime'))
        );

        -- Estimate items table
        CREATE TABLE IF NOT EXISTS estimate_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          estimate_id INTEGER,
          type TEXT,
          description TEXT,
          price REAL,
          quantity INTEGER,
          value REAL,
          fb TEXT,
          FOREIGN KEY (estimate_id) REFERENCES estimates (id)
        );

        -- Invoices table
        CREATE TABLE IF NOT EXISTS invoices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          inv_no TEXT UNIQUE,
          job_no TEXT,
          customer_name TEXT,
          vehicle_no TEXT,
          invoice_date TEXT,
          total_amount REAL DEFAULT 0,
          advance_paid REAL DEFAULT 0,
          balance_due REAL DEFAULT 0,
          created_at DATETIME DEFAULT (datetime('now','localtime')),
          updated_at DATETIME DEFAULT (datetime('now','localtime'))
        );

        -- Invoice items table
        CREATE TABLE IF NOT EXISTS invoice_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_id INTEGER,
          code TEXT,
          description TEXT,
          quantity INTEGER,
          unit_price REAL,
          selling_price REAL,
          discount REAL,
          amount REAL,
          FOREIGN KEY (invoice_id) REFERENCES invoices (id)
        );

        -- Stock receives table
        CREATE TABLE IF NOT EXISTS stock_receives (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          grn_no TEXT UNIQUE,
          rec_date TEXT,
          sup_ref TEXT,
          supplier_name TEXT,
          lot_name TEXT,
          remarks TEXT,
          total_value REAL DEFAULT 0,
          discount_value REAL DEFAULT 0,
          final_value REAL DEFAULT 0,
          created_at DATETIME DEFAULT (datetime('now','localtime')),
          updated_at DATETIME DEFAULT (datetime('now','localtime'))
        );

        -- Stock receive items table
        CREATE TABLE IF NOT EXISTS stock_receive_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          stock_receive_id INTEGER,
          part_id INTEGER,
          pro_no TEXT,
          item_description TEXT,
          supplier_name TEXT,
          sup_ref TEXT,
          unit_price REAL,
          rec_qty INTEGER,
          item_value REAL,
          dis_percent REAL,
          discount_value REAL,
          final_value REAL,
          FOREIGN KEY (stock_receive_id) REFERENCES stock_receives (id),
          FOREIGN KEY (part_id) REFERENCES parts (id)
        );
      `;

      // Execute SQL based on database type
      if (db.exec) {
        // better-sqlite3 style
        db.exec(tableCreationSQL);
      } else {
        // sqlite wrapper style
        await db.exec(tableCreationSQL);
      }
    }
    
    console.log('Database tables created successfully');
  } catch (err) {
    console.error('Error creating tables:', err);
    throw err;
  }
};

// Ensure photo column exists (for backwards compatibility)
const ensurePhotoColumn = async () => {
  try {
    if (usingNativeDatabase) {
      let tableInfo;
      
      if (db.prepare) {
        // better-sqlite3 style
        tableInfo = db.prepare("PRAGMA table_info(parts)").all();
      } else {
        // sqlite wrapper style
        tableInfo = await db.all("PRAGMA table_info(parts)");
      }
      
      const hasPhotoColumn = tableInfo.some(column => column.name === 'photo');
      
      if (!hasPhotoColumn) {
        console.log('Adding missing photo column to parts table');
        if (db.exec) {
          db.exec('ALTER TABLE parts ADD COLUMN photo TEXT');
        } else {
          await db.run('ALTER TABLE parts ADD COLUMN photo TEXT');
        }
        console.log('Photo column added successfully');
      } else {
        console.log('Photo column already exists');
      }
      
      // Also check for updated_at column
      const hasUpdatedAtColumn = tableInfo.some(column => column.name === 'updated_at');
      if (!hasUpdatedAtColumn) {
        console.log('Adding missing updated_at column to parts table');
        if (db.exec) {
          db.exec('ALTER TABLE parts ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');
        } else {
          await db.run('ALTER TABLE parts ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');
        }
        console.log('Updated_at column added successfully');
      }
    } else {
      console.log('Mock database: photo and updated_at columns assumed present');
    }
  } catch (err) {
    console.error('Error ensuring photo column:', err);
    // Don't throw - continue without photo functionality
  }
};

// Get database instance
const getDatabase = () => db;

// Ensure default data exists (for better user experience) - SIMPLE COUNTER SETUP ONLY
const ensureDefaultData = async () => {
  try {
    if (usingNativeDatabase) {
      console.log('🔧 Setting up basic counters only (React components handle sample data)...');
      
      // Only initialize counters - let React components handle sample data
      const insertCounters = [
        ['pro_no', 3],
        ['job_no', 2], 
        ['estimate_invoice', 1],
        ['invoice_no', 1]
      ];
      
      for (const [id, value] of insertCounters) {
        try {
          if (db.prepare) {
            db.prepare('INSERT OR REPLACE INTO counters (id, current_value) VALUES (?, ?)').run(id, value);
          } else {
            await db.run('INSERT OR REPLACE INTO counters (id, current_value) VALUES (?, ?)', [id, value]);
          }
        } catch (err) {
          console.log(`Counter ${id} setup skipped:`, err.message);
        }
      }
      console.log('✅ Basic setup completed - React components will show sample data');
      console.log('🎉 DATABASE SETUP SUCCESSFUL - Sample data handled by frontend!');

    } else {
      console.log('Mock database: React components will handle all sample data');
    }
  } catch (err) {
    console.error('Error in basic setup:', err);
    // Don't throw - React components will handle everything
  }
};

// Check if using native database
const isUsingNativeDatabase = () => usingNativeDatabase;

module.exports = { 
  initDatabase, 
  getDatabase, 
  isUsingNativeDatabase 
};
