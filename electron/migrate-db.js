const { getDatabase, isUsingNativeDatabase } = require('./database');

const migrateDatabase = async () => {
  console.log('🔄 Starting database migration...');
  
  // Use the already initialized database
  const db = getDatabase();
  const isNative = isUsingNativeDatabase();
  
  if (!isNative) {
    console.log('✅ Mock database: Migration skipped (not needed)');
    return;
  }

  try {
    console.log('📊 Running database schema migrations...');
    
    // Check if we're using better-sqlite3 or sqlite wrapper
    const isBetterSqlite = db.prepare !== undefined;
    
    if (isBetterSqlite) {
      // better-sqlite3 migration
      await migrateBetterSqlite3(db);
    } else {
      // sqlite wrapper migration  
      await migrateSqliteWrapper(db);
    }

    console.log('✅ Database migration completed successfully');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
};

// Migration for better-sqlite3 (synchronous)
async function migrateBetterSqlite3(db) {
  // Add new columns to stock_movements table
  safeAlterTableSync(db, 'stock_movements', 'cost_price REAL');
  safeAlterTableSync(db, 'stock_movements', 'selling_price REAL');
  safeAlterTableSync(db, 'stock_movements', 'final_selling_price REAL');
  
  // Add photo column to parts table
  safeAlterTableSync(db, 'parts', 'photo TEXT');
  
  // Add updated_at column to parts table
  safeAlterTableSync(db, 'parts', 'updated_at DATETIME DEFAULT (datetime(\'now\',\'localtime\'))');
  
  // Add advance column to job_cards table
  safeAlterTableSync(db, 'job_cards', 'advance REAL DEFAULT 0');
  
  // Add service_advisor column to job_cards table
  safeAlterTableSync(db, 'job_cards', 'service_advisor TEXT');
  
  // Add GRN tracking to stock movements
  safeAlterTableSync(db, 'stock_movements', 'grn_documented BOOLEAN DEFAULT 0');
  safeAlterTableSync(db, 'stock_movements', 'grn_no TEXT');
  
  // Update existing timestamps to correct timezone
  try {
    const sampleRecord = db.prepare('SELECT created_at FROM parts LIMIT 1').get();
    if (sampleRecord && sampleRecord.created_at) {
      console.log('📅 Timestamp format check:', sampleRecord.created_at);
    }
  } catch (error) {
    console.log('📅 No existing parts to check timestamps for');
  }

  // Ensure estimate invoice counter exists
  try {
    const estimateInvoiceCounter = db.prepare('SELECT * FROM counters WHERE id = ?').get('estimate_invoice');
    if (!estimateInvoiceCounter) {
      db.prepare('INSERT OR IGNORE INTO counters (id, current_value) VALUES (?, ?)').run('estimate_invoice', 0);
    }
  } catch (error) {
    console.log('⚠️ Could not check/create estimate_invoice counter:', error.message);
  }

  // Ensure invoice counter exists
  try {
    const invoiceCounter = db.prepare('SELECT * FROM counters WHERE id = ?').get('invoice_no');
    if (!invoiceCounter) {
      db.prepare('INSERT OR IGNORE INTO counters (id, current_value) VALUES (?, ?)').run('invoice_no', 0);
    }
  } catch (error) {
    console.log('⚠️ Could not check/create invoice_no counter:', error.message);
  }

  // Create invoices table if it doesn't exist
  try {
    db.exec(`
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
      )
    `);
    console.log('✅ Invoices table created/verified');
  } catch (error) {
    console.log('⚠️ Could not create invoices table:', error.message);
  }

  // Create invoice_items table if it doesn't exist
  try {
    db.exec(`
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
      )
    `);
    console.log('✅ Invoice items table created/verified');
  } catch (error) {
    console.log('⚠️ Could not create invoice_items table:', error.message);
  }

  // Ensure GRN counter exists
  try {
    const grnCounter = db.prepare('SELECT * FROM counters WHERE id = ?').get('grn_no');
    if (!grnCounter) {
      db.prepare('INSERT OR IGNORE INTO counters (id, current_value) VALUES (?, ?)').run('grn_no', 0);
    }
  } catch (error) {
    console.log('⚠️ Could not check/create grn_no counter:', error.message);
  }

  // Create stock_receives table if it doesn't exist
  try {
    db.exec(`
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
      )
    `);
    console.log('✅ Stock receives table created/verified');
  } catch (error) {
    console.log('⚠️ Could not create stock_receives table:', error.message);
  }

  // Create stock_receive_items table if it doesn't exist
  try {
    db.exec(`
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
      )
    `);
    safeAlterTableSync(db, 'stock_receive_items', 'supplier_name TEXT');
    safeAlterTableSync(db, 'stock_receive_items', 'sup_ref TEXT');
    db.prepare(`
      UPDATE stock_receive_items
      SET supplier_name = COALESCE(NULLIF(supplier_name, ''), (
            SELECT supplier_name FROM stock_receives
            WHERE stock_receives.id = stock_receive_items.stock_receive_id
          )),
          sup_ref = COALESCE(NULLIF(sup_ref, ''), (
            SELECT sup_ref FROM stock_receives
            WHERE stock_receives.id = stock_receive_items.stock_receive_id
          ))
      WHERE supplier_name IS NULL OR supplier_name = '' OR sup_ref IS NULL OR sup_ref = ''
    `).run();
    console.log('✅ Stock receive items table created/verified');
  } catch (error) {
    console.log('⚠️ Could not create stock_receive_items table:', error.message);
  }
}

// Migration for sqlite wrapper (asynchronous)
async function migrateSqliteWrapper(db) {
  // Add new columns to stock_movements table
  await safeAlterTableAsync(db, 'stock_movements', 'cost_price REAL');
  await safeAlterTableAsync(db, 'stock_movements', 'selling_price REAL');
  await safeAlterTableAsync(db, 'stock_movements', 'final_selling_price REAL');
  
  // Add photo column to parts table
  await safeAlterTableAsync(db, 'parts', 'photo TEXT');
  
  // Add GRN tracking to stock movements
  await safeAlterTableAsync(db, 'stock_movements', 'grn_documented BOOLEAN DEFAULT 0');
  await safeAlterTableAsync(db, 'stock_movements', 'grn_no TEXT');
  
  // Add updated_at column to parts table
  await safeAlterTableAsync(db, 'parts', 'updated_at DATETIME DEFAULT (datetime(\'now\',\'localtime\'))');
  
  // Add advance column to job_cards table
  await safeAlterTableAsync(db, 'job_cards', 'advance REAL DEFAULT 0');
  
  // Add service_advisor column to job_cards table
  await safeAlterTableAsync(db, 'job_cards', 'service_advisor TEXT');
  
  // Update existing timestamps to correct timezone
  try {
    const sampleRecord = await db.get('SELECT created_at FROM parts LIMIT 1');
    if (sampleRecord && sampleRecord.created_at) {
      console.log('📅 Timestamp format check:', sampleRecord.created_at);
    }
  } catch (error) {
    console.log('📅 No existing parts to check timestamps for');
  }

  // Ensure estimate invoice counter exists
  const estimateInvoiceCounter = await db.get('SELECT * FROM counters WHERE id = ?', ['estimate_invoice']);
  if (!estimateInvoiceCounter) {
    await db.run('INSERT INTO counters (id, current_value) VALUES (?, ?)', ['estimate_invoice', 0]);
  }

  // Ensure invoice counter exists  
  const invoiceCounter = await db.get('SELECT * FROM counters WHERE id = ?', ['invoice_no']);
  if (!invoiceCounter) {
    await db.run('INSERT INTO counters (id, current_value) VALUES (?, ?)', ['invoice_no', 0]);
  }

  // Create invoices table if it doesn't exist
  try {
    await db.exec(`
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
      )
    `);
    console.log('✅ Invoices table created/verified');
  } catch (error) {
    console.log('⚠️ Could not create invoices table:', error.message);
  }

  // Create invoice_items table if it doesn't exist
  try {
    await db.exec(`
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
      )
    `);
    console.log('✅ Invoice items table created/verified');
  } catch (error) {
    console.log('⚠️ Could not create invoice_items table:', error.message);
  }

  // Ensure GRN counter exists
  const grnCounter = await db.get('SELECT * FROM counters WHERE id = ?', ['grn_no']);
  if (!grnCounter) {
    await db.run('INSERT INTO counters (id, current_value) VALUES (?, ?)', ['grn_no', 0]);
  }

  // Create stock_receives table if it doesn't exist
  try {
    await db.exec(`
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
      )
    `);
    console.log('✅ Stock receives table created/verified');
  } catch (error) {
    console.log('⚠️ Could not create stock_receives table:', error.message);
  }

  // Create stock_receive_items table if it doesn't exist
  try {
    await db.exec(`
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
      )
    `);
    await safeAlterTableAsync(db, 'stock_receive_items', 'supplier_name TEXT');
    await safeAlterTableAsync(db, 'stock_receive_items', 'sup_ref TEXT');
    await db.run(`
      UPDATE stock_receive_items
      SET supplier_name = COALESCE(NULLIF(supplier_name, ''), (
            SELECT supplier_name FROM stock_receives
            WHERE stock_receives.id = stock_receive_items.stock_receive_id
          )),
          sup_ref = COALESCE(NULLIF(sup_ref, ''), (
            SELECT sup_ref FROM stock_receives
            WHERE stock_receives.id = stock_receive_items.stock_receive_id
          ))
      WHERE supplier_name IS NULL OR supplier_name = '' OR sup_ref IS NULL OR sup_ref = ''
    `);
    console.log('✅ Stock receive items table created/verified');
  } catch (error) {
    console.log('⚠️ Could not create stock_receive_items table:', error.message);
  }
}

// Safe table alteration for better-sqlite3 (synchronous)
function safeAlterTableSync(db, table, column) {
  try {
    // Extract column name from the column definition
    const columnName = column.split(' ')[0];
    
    // Check if column already exists
    const tableInfo = db.prepare(`PRAGMA table_info(${table})`).all();
    const columnExists = tableInfo.some(col => col.name === columnName);
    
    if (columnExists) {
      console.log(`⚠️  Column ${columnName} already exists in ${table}`);
      return;
    }
    
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column}`);
    console.log(`✅ Added column ${column} to ${table}`);
  } catch (error) {
    if (!error.message.includes('duplicate column')) {
      console.log(`⚠️  ${column} column issue:`, error.message);
    }
  }
}

// Safe table alteration for sqlite wrapper (asynchronous)
async function safeAlterTableAsync(db, table, column) {
  try {
    // Extract column name from the column definition
    const columnName = column.split(' ')[0];
    
    // Check if column already exists
    const tableInfo = await db.all(`PRAGMA table_info(${table})`);
    const columnExists = tableInfo.some(col => col.name === columnName);
    
    if (columnExists) {
      console.log(`⚠️  Column ${columnName} already exists in ${table}`);
      return;
    }
    
    await db.run(`ALTER TABLE ${table} ADD COLUMN ${column}`);
    console.log(`✅ Added column ${column} to ${table}`);
  } catch (error) {
    if (!error.message.includes('duplicate column')) {
      console.log(`⚠️  ${column} column issue:`, error.message);
    }
  }
}

module.exports = { migrateDatabase };
