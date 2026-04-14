import express from 'express';
import { createServer as createViteServer } from 'vite';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import cors from 'cors';
import ip from 'ip';
import path from 'path';
import fs from 'fs';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // Initialize SQLite Database
  const dbPath = path.join(process.cwd(), 'pharmacy.db');
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      branchId INTEGER
    );
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      phone TEXT,
      company TEXT,
      balance REAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS medicines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      barcode TEXT,
      name TEXT,
      unit TEXT,
      purchasePrice REAL,
      salePrice REAL,
      quantity INTEGER,
      reorderLimit INTEGER,
      expiryDate TEXT,
      manufacturer TEXT,
      storeId INTEGER,
      branchId INTEGER
    );
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      type TEXT,
      items TEXT,
      totalBeforeDiscount REAL,
      discountPercent REAL,
      discountValue REAL,
      netTotal REAL,
      cashier TEXT,
      customerId INTEGER,
      storeId INTEGER,
      branchId INTEGER
    );
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      type TEXT,
      items TEXT,
      totalBeforeDiscount REAL,
      discountPercent REAL,
      discountValue REAL,
      netTotal REAL,
      cashier TEXT,
      supplierId INTEGER,
      storeId INTEGER,
      branchId INTEGER
    );
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      phone TEXT,
      notes TEXT,
      balance REAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      passwordHash TEXT,
      role TEXT,
      branchId INTEGER
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT,
      username TEXT,
      action TEXT,
      details TEXT
    );
    CREATE TABLE IF NOT EXISTS daily_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      type TEXT,
      amount REAL,
      description TEXT,
      cashier TEXT,
      branchId INTEGER
    );
    CREATE TABLE IF NOT EXISTS transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fromStoreId INTEGER,
      toStoreId INTEGER,
      items TEXT,
      status TEXT DEFAULT 'pending',
      createdAt TEXT,
      updatedAt TEXT,
      createdBy TEXT,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS branches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      address TEXT,
      phone TEXT,
      manager TEXT
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Seed default admin and store
  const adminExists = await db.get('SELECT * FROM users WHERE username = ?', ['admin']);
  if (!adminExists) {
    await db.run('INSERT INTO users (username, passwordHash, role) VALUES (?, ?, ?)', ['admin', 'admin', 'admin']);
  } else if (adminExists.passwordHash !== 'admin') {
    await db.run('UPDATE users SET passwordHash = ? WHERE username = ?', ['admin', 'admin']);
  }
  const branchExists = await db.get('SELECT * FROM branches WHERE id = 1');
  if (!branchExists) {
    await db.run('INSERT INTO branches (name, address, phone) VALUES (?, ?, ?)', ['الفرع الرئيسي', '', '']);
  }
  const storeExists = await db.get('SELECT * FROM stores WHERE id = 1');
  if (!storeExists) {
    await db.run('INSERT INTO stores (name, branchId) VALUES (?, ?)', ['المخزن الرئيسي', 1]);
  }

  const logAction = async (username: string | undefined, action: string, details: any) => {
    try {
      const decodedUser = username ? decodeURIComponent(username) : 'System';
      await db.run(
        'INSERT INTO audit_logs (timestamp, username, action, details) VALUES (?, ?, ?, ?)',
        [new Date().toISOString(), decodedUser, action, JSON.stringify(details)]
      );
    } catch (e) {
      console.error('Failed to log action', e);
    }
  };

  // --- API Routes ---

  // Users
  app.get('/api/users', async (req, res) => {
    try {
      const users = await db.all('SELECT id, username, role FROM users');
      res.json(users);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/users', async (req, res) => {
    const { username, password, role } = req.body;
    try {
      const result = await db.run('INSERT INTO users (username, passwordHash, role) VALUES (?, ?, ?)', [username, password, role]);
      await logAction(req.headers['x-username'] as string, 'ADD_USER', { id: result.lastID, username });
      res.json({ id: result.lastID });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put('/api/users/:id', async (req, res) => {
    try {
      const { username, password, role } = req.body;
      if (password) {
        await db.run('UPDATE users SET username = ?, passwordHash = ?, role = ? WHERE id = ?', [username, password, role, req.params.id]);
      } else {
        await db.run('UPDATE users SET username = ?, role = ? WHERE id = ?', [username, role, req.params.id]);
      }
      await logAction(req.headers['x-username'] as string, 'UPDATE_USER', { id: req.params.id, username });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    try {
      await db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
      await logAction(req.headers['x-username'] as string, 'DELETE_USER', { id: req.params.id });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Stores
  app.get('/api/stores', async (req, res) => {
    try {
      const stores = await db.all('SELECT * FROM stores');
      res.json(stores);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/stores', async (req, res) => {
    try {
      const { name, branchId } = req.body;
      const result = await db.run('INSERT INTO stores (name, branchId) VALUES (?, ?)', [name, branchId || 1]);
      await logAction(req.headers['x-username'] as string, 'ADD_STORE', { id: result.lastID, name });
      res.json({ id: result.lastID });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/stores/:id', async (req, res) => {
    try {
      const { name, branchId } = req.body;
      await db.run('UPDATE stores SET name = ?, branchId = ? WHERE id = ?', [name, branchId || 1, req.params.id]);
      await logAction(req.headers['x-username'] as string, 'UPDATE_STORE', { id: req.params.id, name });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/stores/:id', async (req, res) => {
    try {
      await db.run('DELETE FROM stores WHERE id = ?', [req.params.id]);
      await logAction(req.headers['x-username'] as string, 'DELETE_STORE', { id: req.params.id });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Branches
  app.get('/api/branches', async (req, res) => {
    try {
      const branches = await db.all('SELECT * FROM branches');
      res.json(branches);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/branches', async (req, res) => {
    try {
      const { name, address, phone } = req.body;
      const result = await db.run('INSERT INTO branches (name, address, phone) VALUES (?, ?, ?)', [name, address, phone]);
      await logAction(req.headers['x-username'] as string, 'ADD_BRANCH', { id: result.lastID, name });
      res.json({ id: result.lastID });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/branches/:id', async (req, res) => {
    try {
      const { name, address, phone } = req.body;
      await db.run('UPDATE branches SET name = ?, address = ?, phone = ? WHERE id = ?', [name, address, phone, req.params.id]);
      await logAction(req.headers['x-username'] as string, 'UPDATE_BRANCH', { id: req.params.id, name });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/branches/:id', async (req, res) => {
    try {
      await db.run('DELETE FROM branches WHERE id = ?', [req.params.id]);
      await logAction(req.headers['x-username'] as string, 'DELETE_BRANCH', { id: req.params.id });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Daily Accounts
  app.get('/api/daily-accounts', async (req, res) => {
    try {
      const accounts = await db.all('SELECT * FROM daily_accounts ORDER BY date DESC');
      res.json(accounts);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/daily-accounts', async (req, res) => {
    try {
      const { date, type, amount, description, cashier } = req.body;
      const result = await db.run(
        'INSERT INTO daily_accounts (date, type, amount, description, cashier) VALUES (?, ?, ?, ?, ?)',
        [date, type, amount, description, cashier]
      );
      await logAction(req.headers['x-username'] as string, 'ADD_DAILY_ACCOUNT', { id: result.lastID, type, amount });
      res.json({ id: result.lastID });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Settings
  app.get('/api/settings', async (req, res) => {
    try {
      const settings = await db.all('SELECT * FROM settings');
      const settingsObj = settings.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      res.json(settingsObj);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/settings', async (req, res) => {
    const settings = req.body;
    await db.exec('BEGIN TRANSACTION');
    try {
      for (const [key, value] of Object.entries(settings)) {
        await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
      }
      await db.exec('COMMIT');
      await logAction(req.headers['x-username'] as string, 'UPDATE_SETTINGS', {});
      res.json({ success: true });
    } catch (error) {
      await db.exec('ROLLBACK');
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  app.get('/api/network', (req, res) => {
    res.json({ ip: ip.address(), port: PORT });
  });

  // Audit Logs
  app.get('/api/audit-logs', async (req, res) => {
    try {
      const logs = await db.all('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500');
      res.json(logs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Medicines
  app.get('/api/medicines', async (req, res) => {
    try {
      const medicines = await db.all('SELECT * FROM medicines');
      res.json(medicines);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/medicines', async (req, res) => {
    const { code, barcode, name, unit, purchasePrice, salePrice, quantity, reorderLimit, expiryDate, manufacturer, storeId } = req.body;
    try {
      const result = await db.run(
        'INSERT INTO medicines (code, barcode, name, unit, purchasePrice, salePrice, quantity, reorderLimit, expiryDate, manufacturer, storeId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [code, barcode, name, unit, purchasePrice, salePrice, quantity, reorderLimit, expiryDate, manufacturer, storeId || 1]
      );
      await logAction(req.headers['x-username'] as string, 'ADD_MEDICINE', { id: result.lastID, name });
      res.json({ id: result.lastID });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put('/api/medicines/:id', async (req, res) => {
    try {
      const { code, barcode, name, unit, purchasePrice, salePrice, quantity, reorderLimit, expiryDate, manufacturer, storeId } = req.body;
      await db.run(
        'UPDATE medicines SET code = ?, barcode = ?, name = ?, unit = ?, purchasePrice = ?, salePrice = ?, quantity = ?, reorderLimit = ?, expiryDate = ?, manufacturer = ?, storeId = ? WHERE id = ?',
        [code, barcode, name, unit, purchasePrice, salePrice, quantity, reorderLimit, expiryDate, manufacturer, storeId || 1, req.params.id]
      );
      await logAction(req.headers['x-username'] as string, 'UPDATE_MEDICINE', { id: req.params.id, name });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/medicines/:id', async (req, res) => {
    try {
      await db.run('DELETE FROM medicines WHERE id = ?', [req.params.id]);
      await logAction(req.headers['x-username'] as string, 'DELETE_MEDICINE', { id: req.params.id });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Sales
  app.get('/api/sales', async (req, res) => {
    try {
      const sales = await db.all('SELECT * FROM sales');
      const parsedSales = sales.map(s => ({ ...s, items: JSON.parse(s.items) }));
      res.json(parsedSales);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/sales', async (req, res) => {
    const { date, type, items, totalBeforeDiscount, discountPercent, discountValue, netTotal, cashier, customerId, storeId } = req.body;
    
    await db.exec('BEGIN TRANSACTION');
    try {
      for (const item of items) {
        await db.run('UPDATE medicines SET quantity = quantity - ? WHERE id = ?', [item.quantity, item.medicineId]);
      }
      
      const result = await db.run(
        'INSERT INTO sales (date, type, items, totalBeforeDiscount, discountPercent, discountValue, netTotal, cashier, customerId, storeId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [date, type, JSON.stringify(items), totalBeforeDiscount, discountPercent, discountValue, netTotal, cashier, customerId, storeId || 1]
      );
      
      await db.exec('COMMIT');
      await logAction(cashier || (req.headers['x-username'] as string), 'ADD_SALE', { id: result.lastID, netTotal });
      res.json({ id: result.lastID });
    } catch (error: any) {
      await db.exec('ROLLBACK');
      res.status(500).json({ error: 'Transaction failed', details: error.message });
    }
  });

  // Purchases
  app.get('/api/purchases', async (req, res) => {
    try {
      const purchases = await db.all('SELECT * FROM purchases');
      const parsedPurchases = purchases.map(p => ({ ...p, items: JSON.parse(p.items) }));
      res.json(parsedPurchases);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/purchases', async (req, res) => {
    const { date, type, items, totalBeforeDiscount, discountPercent, discountValue, netTotal, cashier, supplierId, storeId } = req.body;
    
    await db.exec('BEGIN TRANSACTION');
    try {
      for (const item of items) {
        await db.run('UPDATE medicines SET quantity = quantity + ? WHERE id = ?', [item.quantity, item.medicineId]);
      }
      
      const result = await db.run(
        'INSERT INTO purchases (date, type, items, totalBeforeDiscount, discountPercent, discountValue, netTotal, cashier, supplierId, storeId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [date, type, JSON.stringify(items), totalBeforeDiscount, discountPercent, discountValue, netTotal, cashier, supplierId, storeId || 1]
      );
      
      await db.exec('COMMIT');
      await logAction(cashier || (req.headers['x-username'] as string), 'ADD_PURCHASE', { id: result.lastID, netTotal });
      res.json({ id: result.lastID });
    } catch (error: any) {
      await db.exec('ROLLBACK');
      res.status(500).json({ error: 'Transaction failed', details: error.message });
    }
  });

  // Transfers
  app.get('/api/transfers', async (req, res) => {
    try {
      const transfers = await db.all('SELECT * FROM transfers ORDER BY createdAt DESC');
      const parsedTransfers = transfers.map(t => ({ ...t, items: JSON.parse(t.items) }));
      res.json(parsedTransfers);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/transfers/:id', async (req, res) => {
    try {
      const transfer = await db.get('SELECT * FROM transfers WHERE id = ?', [req.params.id]);
      if (transfer) {
        transfer.items = JSON.parse(transfer.items);
      }
      res.json(transfer);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/transfers', async (req, res) => {
    const { fromStoreId, toStoreId, items, notes } = req.body;
    const createdBy = req.headers['x-username'] as string;
    const createdAt = new Date().toISOString();

    // Validate stock availability
    for (const item of items) {
      const medicine = await db.get('SELECT quantity FROM medicines WHERE id = ? AND storeId = ?', [item.medicineId, fromStoreId]);
      if (!medicine || medicine.quantity < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${item.name}` });
      }
    }

    try {
      const result = await db.run(
        'INSERT INTO transfers (fromStoreId, toStoreId, items, status, createdAt, updatedAt, createdBy, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [fromStoreId, toStoreId, JSON.stringify(items), 'pending', createdAt, createdAt, createdBy, notes]
      );
      await logAction(createdBy, 'CREATE_TRANSFER', { id: result.lastID, fromStoreId, toStoreId });
      res.json({ id: result.lastID });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/transfers/:id', async (req, res) => {
    const { status, items, notes } = req.body;
    const updatedAt = new Date().toISOString();
    const updatedBy = req.headers['x-username'] as string;

    await db.exec('BEGIN TRANSACTION');
    try {
      if (status === 'received') {
        // Update stock: decrease from source, increase to destination
        const transfer = await db.get('SELECT * FROM transfers WHERE id = ?', [req.params.id]);
        const transferItems = JSON.parse(transfer.items);

        for (const item of transferItems) {
          await db.run('UPDATE medicines SET quantity = quantity - ? WHERE id = ? AND storeId = ?', [item.quantity, item.medicineId, transfer.fromStoreId]);
          // Check if medicine exists in destination store
          const existing = await db.get('SELECT id FROM medicines WHERE barcode = ? AND storeId = ?', [item.barcode, transfer.toStoreId]);
          if (existing) {
            await db.run('UPDATE medicines SET quantity = quantity + ? WHERE id = ?', [item.quantity, existing.id]);
          } else {
            // Create new medicine entry in destination store
            const sourceMed = await db.get('SELECT * FROM medicines WHERE id = ?', [item.medicineId]);
            await db.run(
              'INSERT INTO medicines (code, barcode, name, unit, purchasePrice, salePrice, quantity, reorderLimit, expiryDate, manufacturer, storeId, branchId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [sourceMed.code, sourceMed.barcode, sourceMed.name, sourceMed.unit, sourceMed.purchasePrice, sourceMed.salePrice, item.quantity, sourceMed.reorderLimit, item.expiryDate, sourceMed.manufacturer, transfer.toStoreId, null]
            );
          }
        }
      }

      await db.run(
        'UPDATE transfers SET status = ?, updatedAt = ?, notes = ? WHERE id = ?',
        [status, updatedAt, notes, req.params.id]
      );

      await db.exec('COMMIT');
      await logAction(updatedBy, 'UPDATE_TRANSFER', { id: req.params.id, status });
      res.json({ success: true });
    } catch (error: any) {
      await db.exec('ROLLBACK');
      res.status(500).json({ error: 'Transaction failed', details: error.message });
    }
  });

  app.delete('/api/transfers/:id', async (req, res) => {
    try {
      await db.run('DELETE FROM transfers WHERE id = ?', [req.params.id]);
      await logAction(req.headers['x-username'] as string, 'DELETE_TRANSFER', { id: req.params.id });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Suppliers
  app.get('/api/suppliers', async (req, res) => {
    try {
      const suppliers = await db.all('SELECT * FROM suppliers');
      res.json(suppliers);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/suppliers', async (req, res) => {
    try {
      const { name, phone, company, balance } = req.body;
      const result = await db.run('INSERT INTO suppliers (name, phone, company, balance) VALUES (?, ?, ?, ?)', [name, phone, company, balance || 0]);
      await logAction(req.headers['x-username'] as string, 'ADD_SUPPLIER', { id: result.lastID, name });
      res.json({ id: result.lastID });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/suppliers/:id', async (req, res) => {
    try {
      const { name, phone, company, balance } = req.body;
      await db.run('UPDATE suppliers SET name = ?, phone = ?, company = ?, balance = ? WHERE id = ?', [name, phone, company, balance, req.params.id]);
      await logAction(req.headers['x-username'] as string, 'UPDATE_SUPPLIER', { id: req.params.id, name });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/suppliers/:id', async (req, res) => {
    try {
      await db.run('DELETE FROM suppliers WHERE id = ?', [req.params.id]);
      await logAction(req.headers['x-username'] as string, 'DELETE_SUPPLIER', { id: req.params.id });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Customers
  app.get('/api/customers', async (req, res) => {
    try {
      const customers = await db.all('SELECT * FROM customers');
      res.json(customers);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/customers', async (req, res) => {
    try {
      const { name, phone, notes, balance } = req.body;
      const result = await db.run('INSERT INTO customers (name, phone, notes, balance) VALUES (?, ?, ?, ?)', [name, phone, notes, balance || 0]);
      await logAction(req.headers['x-username'] as string, 'ADD_CUSTOMER', { id: result.lastID, name });
      res.json({ id: result.lastID });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/customers/:id', async (req, res) => {
    try {
      const { name, phone, notes, balance } = req.body;
      await db.run('UPDATE customers SET name = ?, phone = ?, notes = ?, balance = ? WHERE id = ?', [name, phone, notes, balance, req.params.id]);
      await logAction(req.headers['x-username'] as string, 'UPDATE_CUSTOMER', { id: req.params.id, name });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/customers/:id', async (req, res) => {
    try {
      await db.run('DELETE FROM customers WHERE id = ?', [req.params.id]);
      await logAction(req.headers['x-username'] as string, 'DELETE_CUSTOMER', { id: req.params.id });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Users (Login)
  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await db.get('SELECT * FROM users WHERE username = ? AND passwordHash = ?', [username, password]);
      if (user) {
        await logAction(username, 'LOGIN', {});
        res.json(user);
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Export/Import
  app.get('/api/export', async (req, res) => {
    try {
      const medicines = await db.all('SELECT * FROM medicines');
      const sales = await db.all('SELECT * FROM sales');
      const customers = await db.all('SELECT * FROM customers');
      const users = await db.all('SELECT * FROM users');
      
      await logAction(req.headers['x-username'] as string, 'EXPORT_DATA', {});
      
      res.json({
        medicines,
        sales: sales.map(s => ({ ...s, items: JSON.parse(s.items) })),
        customers,
        users
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/import', async (req, res) => {
    const { medicines, sales, customers, users } = req.body;
    
    await db.exec('BEGIN TRANSACTION');
    try {
      await db.run('DELETE FROM medicines');
      await db.run('DELETE FROM sales');
      await db.run('DELETE FROM customers');
      await db.run('DELETE FROM users');

      for (const m of medicines || []) {
        await db.run('INSERT INTO medicines (id, barcode, name, purchasePrice, salePrice, quantity, expiryDate, manufacturer) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
          [m.id, m.barcode, m.name, m.purchasePrice, m.salePrice, m.quantity, m.expiryDate, m.manufacturer]);
      }
      for (const s of sales || []) {
        await db.run('INSERT INTO sales (id, date, type, items, totalBeforeDiscount, discountPercent, discountValue, netTotal, cashier, customerId, storeId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
          [s.id, s.date, s.type || 'cash', JSON.stringify(s.items), s.totalBeforeDiscount || s.netTotal || 0, s.discountPercent || 0, s.discountValue || 0, s.netTotal || 0, s.cashier, s.customerId, s.storeId]);
      }
      for (const c of customers || []) {
        await db.run('INSERT INTO customers (id, name, phone, notes) VALUES (?, ?, ?, ?)', 
          [c.id, c.name, c.phone, c.notes]);
      }
      for (const u of users || []) {
        await db.run('INSERT INTO users (id, username, passwordHash, role) VALUES (?, ?, ?, ?)', 
          [u.id, u.username, u.passwordHash, u.role]);
      }

      await db.exec('COMMIT');
      await logAction(req.headers['x-username'] as string, 'IMPORT_DATA', {});
      res.json({ success: true });
    } catch (error) {
      await db.exec('ROLLBACK');
      res.status(500).json({ error: 'Import failed' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Local Network IP: http://${ip.address()}:${PORT}`);
  });
}

startServer();
