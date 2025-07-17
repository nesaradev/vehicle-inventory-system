// Web-only database using localStorage
class WebDatabase {
  constructor() {
    this.tables = {
      parts: 'parts_data',
      jobCards: 'job_cards_data',
      stockMovements: 'stock_movements_data',
      counters: 'counters_data',
      lowStockAlerts: 'low_stock_alerts_data',
      estimates: 'estimates_data',
      invoices: 'invoices_data'
    };
    this.initTables();
  }

  initTables() {
    Object.values(this.tables).forEach(table => {
      if (!localStorage.getItem(table)) {
        localStorage.setItem(table, JSON.stringify([]));
      }
    });

    // Initialize counters
    if (!localStorage.getItem(this.tables.counters)) {
      localStorage.setItem(this.tables.counters, JSON.stringify({
        job_card_counter: 1,
        estimate_counter: 1,
        invoice_counter: 1
      }));
    }

  }


  async query(type, query, params = []) {
    // Simple query simulation for web version
    try {
      // Handle COUNT queries
      if (query.includes('COUNT(*)')) {
        if (query.includes('FROM parts')) {
          const parts = this.getAll('parts');
          return type === 'get' ? { count: parts.length } : [{ count: parts.length }];
        }
        if (query.includes('FROM job_cards')) {
          const jobCards = this.getAll('jobCards');
          if (query.includes("status = 'pending'")) {
            const pending = jobCards.filter(job => job.status === 'pending');
            return type === 'get' ? { count: pending.length } : [{ count: pending.length }];
          }
          if (query.includes("status = 'completed'")) {
            const completed = jobCards.filter(job => job.status === 'completed');
            return type === 'get' ? { count: completed.length } : [{ count: completed.length }];
          }
          return type === 'get' ? { count: jobCards.length } : [{ count: jobCards.length }];
        }
        return type === 'get' ? { count: 0 } : [{ count: 0 }];
      }

      // Handle SUM queries
      if (query.includes('SUM(')) {
        const parts = this.getAll('parts');
        const revenue = parts.reduce((sum, part) => sum + (part.current_stock || 0) * (part.final_selling_price || 0), 0);
        const cost = parts.reduce((sum, part) => sum + (part.current_stock || 0) * (part.cost_price || 0), 0);
        return type === 'get' ? { revenue, cost } : [{ revenue, cost }];
      }

      // Handle low stock queries
      if (query.includes('current_stock <= low_stock_threshold')) {
        const parts = this.getAll('parts');
        const lowStockParts = parts.filter(part => 
          (part.current_stock || 0) <= (part.low_stock_threshold || 10)
        ).slice(0, 5);
        return lowStockParts;
      }

      // Handle SELECT * queries
      if (query.includes('SELECT * FROM parts')) {
        return this.getAll('parts');
      }
      if (query.includes('SELECT * FROM job_cards')) {
        return this.getAll('jobCards');
      }
      if (query.includes('SELECT * FROM stock_movements')) {
        return this.getAll('stockMovements');
      }
      if (query.includes('SELECT * FROM estimates')) {
        return this.getAll('estimates');
      }
      if (query.includes('SELECT * FROM invoices')) {
        return this.getAll('invoices');
      }

      // Handle INSERT queries
      if (query.includes('INSERT INTO parts')) {
        return this.insertPart(params);
      }
      if (query.includes('INSERT INTO job_cards')) {
        return this.insertJobCard(params);
      }
      if (query.includes('INSERT INTO estimates')) {
        return this.insertEstimate(params);
      }
      if (query.includes('INSERT INTO invoices')) {
        return this.insertInvoice(params);
      }

      // Default return based on type
      return type === 'get' ? null : [];
    } catch (error) {
      console.error('Web database error:', error);
      return type === 'get' ? null : [];
    }
  }

  getAll(tableName) {
    const data = localStorage.getItem(this.tables[tableName]);
    return data ? JSON.parse(data) : [];
  }

  insertPart(params) {
    const parts = this.getAll('parts');
    const newPart = {
      id: Date.now(),
      pro_no: params[0],
      part_name: params[1],
      category: params[2],
      unit_price: params[3],
      current_stock: params[4],
      low_stock_threshold: params[5],
      location: params[6],
      supplier: params[7],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    parts.push(newPart);
    localStorage.setItem(this.tables.parts, JSON.stringify(parts));
    return { lastID: newPart.id, changes: 1 };
  }

  insertJobCard(params) {
    const jobCards = this.getAll('jobCards');
    const counters = JSON.parse(localStorage.getItem(this.tables.counters));
    const newJobCard = {
      id: Date.now(),
      job_card_no: `JC${String(counters.job_card_counter).padStart(4, '0')}`,
      customer_name: params[1],
      customer_phone: params[2],
      customer_email: params[3],
      vehicle_make: params[4],
      vehicle_model: params[5],
      vehicle_year: params[6],
      vehicle_reg: params[7],
      issue_description: params[8],
      status: params[9] || 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    jobCards.push(newJobCard);
    counters.job_card_counter++;
    localStorage.setItem(this.tables.jobCards, JSON.stringify(jobCards));
    localStorage.setItem(this.tables.counters, JSON.stringify(counters));
    return { lastID: newJobCard.id, changes: 1 };
  }

  insertEstimate(params) {
    const estimates = this.getAll('estimates');
    const counters = JSON.parse(localStorage.getItem(this.tables.counters));
    const newEstimate = {
      id: Date.now(),
      estimate_no: `EST${String(counters.estimate_counter).padStart(4, '0')}`,
      customer_name: params[1],
      customer_phone: params[2],
      customer_email: params[3],
      vehicle_make: params[4],
      vehicle_model: params[5],
      vehicle_year: params[6],
      vehicle_reg: params[7],
      parts_data: params[8],
      total_amount: params[9],
      status: params[10] || 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    estimates.push(newEstimate);
    counters.estimate_counter++;
    localStorage.setItem(this.tables.estimates, JSON.stringify(estimates));
    localStorage.setItem(this.tables.counters, JSON.stringify(counters));
    return { lastID: newEstimate.id, changes: 1 };
  }

  insertInvoice(params) {
    const invoices = this.getAll('invoices');
    const counters = JSON.parse(localStorage.getItem(this.tables.counters));
    const newInvoice = {
      id: Date.now(),
      invoice_no: `INV${String(counters.invoice_counter).padStart(4, '0')}`,
      customer_name: params[1],
      customer_phone: params[2],
      customer_email: params[3],
      vehicle_make: params[4],
      vehicle_model: params[5],
      vehicle_year: params[6],
      vehicle_reg: params[7],
      parts_data: params[8],
      total_amount: params[9],
      status: params[10] || 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    invoices.push(newInvoice);
    counters.invoice_counter++;
    localStorage.setItem(this.tables.invoices, JSON.stringify(invoices));
    localStorage.setItem(this.tables.counters, JSON.stringify(counters));
    return { lastID: newInvoice.id, changes: 1 };
  }
}

// Create a global database instance for web
window.webDatabase = new WebDatabase();

export default WebDatabase;