import express from 'express';
import { createServer as createViteServer } from 'vite';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import cors from 'cors';
import ip from 'ip';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

const upload = multer({ dest: 'uploads/' });

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
      branchId INTEGER,
      lastPriceUpdate TEXT
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
    CREATE TABLE IF NOT EXISTS stock_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER NOT NULL,
      supplier_id INTEGER,
      receipt_date TEXT NOT NULL DEFAULT (datetime('now')),
      total_value REAL DEFAULT 0,
      notes TEXT,
      created_by TEXT,
      FOREIGN KEY (branch_id) REFERENCES branches(id)
    );
    CREATE TABLE IF NOT EXISTS stock_receipt_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      purchase_price REAL NOT NULL,
      expiry_date TEXT,
      FOREIGN KEY (receipt_id) REFERENCES stock_receipts(id),
      FOREIGN KEY (product_id) REFERENCES medicines(id)
    );
    CREATE TABLE IF NOT EXISTS stock_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_branch_id INTEGER NOT NULL,
      to_branch_id INTEGER NOT NULL,
      transfer_date TEXT NOT NULL DEFAULT (datetime('now')),
      notes TEXT,
      created_by TEXT,
      FOREIGN KEY (from_branch_id) REFERENCES branches(id),
      FOREIGN KEY (to_branch_id) REFERENCES branches(id)
    );
    CREATE TABLE IF NOT EXISTS stock_transfer_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transfer_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      FOREIGN KEY (transfer_id) REFERENCES stock_transfers(id),
      FOREIGN KEY (product_id) REFERENCES medicines(id)
    );
  `);

  // Seed default admin and store
  const adminExists = await db.get('SELECT * FROM users WHERE username = ?', ['admin']);
  if (!adminExists) {
    await db.run('INSERT INTO users (username, passwordHash, role) VALUES (?, ?, ?)', ['admin', 'admin', 'admin']);
  }
  const branchExists = await db.get('SELECT * FROM branches WHERE id = 1');
  if (!branchExists) {
    await db.run('INSERT INTO branches (name, address, phone) VALUES (?, ?, ?)', ['الفرع الرئيسي', '', '']);
  }
  const storeExists = await db.get('SELECT * FROM stores WHERE id = 1');
  if (!storeExists) {
    await db.run('INSERT INTO stores (name, branchId) VALUES (?, ?)', ['المخزن الرئيسي', 1]);
  }

  // Add lastPriceUpdate column if it doesn't exist
  try {
    await db.exec('ALTER TABLE medicines ADD COLUMN lastPriceUpdate TEXT');
  } catch (e) {
    // Column might already exist, ignore error
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
  // --- New Endpoints for Features 1, 2, 3 ---

  // Feature 1: Stock Receipts (استلام طلبية)
  app.post('/api/stock-receipts', async (req, res) => {
    const { branchId, supplierId, notes, items } = req.body;
    const username = req.headers['x-username'] as string;
    
    if (!branchId || !items || !items.length) {
      return res.status(400).json({ error: 'Branch ID and items are required' });
    }

    try {
      await db.exec('BEGIN TRANSACTION');
      
      let totalValue = 0;
      for (const item of items) {
        totalValue += item.quantity * item.purchasePrice;
      }

      const result = await db.run(
        'INSERT INTO stock_receipts (branch_id, supplier_id, total_value, notes, created_by) VALUES (?, ?, ?, ?, ?)',
        [branchId, supplierId, totalValue, notes, username]
      );
      
      const receiptId = result.lastID;

      for (const item of items) {
        await db.run(
          'INSERT INTO stock_receipt_items (receipt_id, product_id, quantity, purchase_price, expiry_date) VALUES (?, ?, ?, ?, ?)',
          [receiptId, item.productId, item.quantity, item.purchasePrice, item.expiryDate]
        );

        // Determine prices
        const newPurchasePrice = item.newPurchasePrice !== undefined ? item.newPurchasePrice : item.purchasePrice;
        const newSalePrice = item.newSalePrice !== undefined ? item.newSalePrice : undefined;
        const now = new Date().toISOString();

        // Update product stock and optionally purchase price/sale price/expiry date
        let updateQuery = 'UPDATE medicines SET quantity = quantity + ?, purchasePrice = ?, expiryDate = ?, lastPriceUpdate = ?';
        let updateParams: any[] = [item.quantity, newPurchasePrice, item.expiryDate, now];

        if (newSalePrice !== undefined) {
          updateQuery += ', salePrice = ?';
          updateParams.push(newSalePrice);
        }

        updateQuery += ' WHERE id = ?';
        updateParams.push(item.productId);

        await db.run(updateQuery, updateParams);
      }

      await db.exec('COMMIT');
      await logAction(username, 'CREATE_STOCK_RECEIPT', { receiptId, totalValue });
      res.json({ success: true, receiptId });
    } catch (e: any) {
      await db.exec('ROLLBACK');
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/stock-receipts', async (req, res) => {
    try {
      const receipts = await db.all('SELECT * FROM stock_receipts ORDER BY receipt_date DESC');
      res.json(receipts);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Feature 3: Stock Transfers (نقل مخزون)
  app.post('/api/stock-transfers', async (req, res) => {
    const { fromBranchId, toBranchId, notes, items } = req.body;
    const username = req.headers['x-username'] as string;

    if (!fromBranchId || !toBranchId || !items || !items.length) {
      return res.status(400).json({ error: 'Source, destination, and items are required' });
    }

    try {
      await db.exec('BEGIN TRANSACTION');

      const result = await db.run(
        'INSERT INTO stock_transfers (from_branch_id, to_branch_id, notes, created_by) VALUES (?, ?, ?, ?)',
        [fromBranchId, toBranchId, notes, username]
      );
      
      const transferId = result.lastID;

      for (const item of items) {
        await db.run(
          'INSERT INTO stock_transfer_items (transfer_id, product_id, quantity) VALUES (?, ?, ?)',
          [transferId, item.productId, item.quantity]
        );

        // Deduct from source branch
        await db.run(
          'UPDATE medicines SET quantity = quantity - ? WHERE id = ?',
          [item.quantity, item.productId]
        );

        // Add to destination branch
        // Check if product exists in destination branch by barcode or name
        const sourceProduct = await db.get('SELECT * FROM medicines WHERE id = ?', [item.productId]);
        if (sourceProduct) {
          const destProduct = await db.get(
            'SELECT * FROM medicines WHERE branchId = ? AND (barcode = ? OR name = ?)',
            [toBranchId, sourceProduct.barcode, sourceProduct.name]
          );

          if (destProduct) {
            await db.run(
              'UPDATE medicines SET quantity = quantity + ? WHERE id = ?',
              [item.quantity, destProduct.id]
            );
          } else {
            // Create new product in destination branch
            const newCode = sourceProduct.code + '-B' + toBranchId; // Ensure unique code
            await db.run(
              'INSERT INTO medicines (code, barcode, name, unit, purchasePrice, salePrice, quantity, reorderLimit, expiryDate, manufacturer, storeId, branchId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [newCode, sourceProduct.barcode, sourceProduct.name, sourceProduct.unit, sourceProduct.purchasePrice, sourceProduct.salePrice, item.quantity, sourceProduct.reorderLimit, sourceProduct.expiryDate, sourceProduct.manufacturer, sourceProduct.storeId, toBranchId]
            );
          }
        }
      }

      await db.exec('COMMIT');
      await logAction(username, 'CREATE_STOCK_TRANSFER', { transferId, fromBranchId, toBranchId });
      res.json({ success: true, transferId });
    } catch (e: any) {
      await db.exec('ROLLBACK');
      res.status(500).json({ error: e.message });
    }
  });

  // Search products by name or barcode
  app.get('/api/products/search', async (req, res) => {
    const { q, branch_id } = req.query;
    if (!q || !branch_id) {
      return res.status(400).json({ error: 'Query (q) and branch_id are required' });
    }
    try {
      const products = await db.all(
        'SELECT * FROM medicines WHERE branchId = ? AND (name LIKE ? OR barcode = ? OR code = ?) LIMIT 20',
        [branch_id, `%${q}%`, q, q]
      );
      res.json(products);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get low stock items
  app.get('/api/products/low-stock', async (req, res) => {
    const { branch_id } = req.query;
    try {
      let query = 'SELECT * FROM medicines WHERE quantity <= reorderLimit';
      const params: any[] = [];
      if (branch_id) {
        query += ' AND branchId = ?';
        params.push(branch_id);
      }
      const products = await db.all(query, params);
      res.json(products);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get expiring items
  app.get('/api/products/expiring', async (req, res) => {
    const { days, branch_id } = req.query;
    const daysNum = parseInt(days as string) || 30;
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysNum);
      const targetDateStr = targetDate.toISOString().split('T')[0];

      let query = 'SELECT * FROM medicines WHERE expiryDate <= ? AND expiryDate != ""';
      const params: any[] = [targetDateStr];
      
      if (branch_id) {
        query += ' AND branchId = ?';
        params.push(branch_id);
      }
      
      const products = await db.all(query, params);
      res.json(products);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- End of New Endpoints ---

  app.get('/api/medicines', async (req, res) => {
    try {
      const medicines = await db.all('SELECT * FROM medicines');
      res.json(medicines);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/medicines/extract-db', upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    try {
      const uploadedDbPath = req.file.path;
      const uploadedDb = await open({
        filename: uploadedDbPath,
        driver: sqlite3.Database
      });
      
      const tables = await uploadedDb.all("SELECT name FROM sqlite_master WHERE type='table'");
      const tableNames = tables.map(t => t.name);
      
      let targetTable = '';
      const possibleNames = ['medicines', 'medicine', 'drugs', 'drug', 'products', 'product', 'items', 'item', 'الأدوية', 'الاصناف'];
      for (const name of possibleNames) {
        const found = tableNames.find(t => t.toLowerCase() === name.toLowerCase());
        if (found) {
          targetTable = found;
          break;
        }
      }
      
      if (!targetTable && tableNames.length > 0) {
        const userTables = tableNames.filter(t => !t.startsWith('sqlite_'));
        if (userTables.length > 0) {
          targetTable = userTables[0];
        }
      }

      if (!targetTable) {
        await uploadedDb.close();
        fs.unlinkSync(uploadedDbPath);
        return res.status(400).json({ error: 'لم يتم العثور على جداول في قاعدة البيانات.' });
      }

      const rows = await uploadedDb.all(`SELECT * FROM "${targetTable}"`);
      await uploadedDb.close();
      fs.unlinkSync(uploadedDbPath);

      res.json({ table: targetTable, rows });
    } catch (e: any) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/medicines/import-db', upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    try {
      const uploadedDbPath = req.file.path;
      const uploadedDb = await open({
        filename: uploadedDbPath,
        driver: sqlite3.Database
      });
      
      // Check if medicines table exists
      const tables = await uploadedDb.all("SELECT name FROM sqlite_master WHERE type='table'");
      const tableNames = tables.map(t => t.name);
      
      let targetTable = 'medicines';
      if (!tableNames.includes('medicines')) {
        // Try to find a table that might be medicines
        if (tableNames.includes('medicine')) targetTable = 'medicine';
        else if (tableNames.includes('Items')) targetTable = 'Items';
        else if (tableNames.includes('items')) targetTable = 'items';
        else if (tableNames.includes('Products')) targetTable = 'Products';
        else if (tableNames.includes('products')) targetTable = 'products';
        else {
          await uploadedDb.close();
          fs.unlinkSync(uploadedDbPath);
          return res.status(400).json({ error: `لم يتم العثور على جدول الأدوية. الجداول المتاحة: ${tableNames.join(', ')}` });
        }
      }

      const importedMedicines = await uploadedDb.all(`SELECT * FROM ${targetTable}`);
      await uploadedDb.close();
      fs.unlinkSync(uploadedDbPath);

      let importedCount = 0;
      let errors = [];
      await db.exec('BEGIN TRANSACTION');
      try {
        for (const med of importedMedicines) {
          try {
            // Map common column names
            let code = med.code || med.Code || med.id || '';
            if (!code) {
              code = 'MED-' + Math.floor(Math.random() * 1000000);
            }
            const barcode = med.barcode || med.Barcode || med.code || '';
            const name = med.name || med.Name || med.item_name || med.ItemName || 'بدون اسم';
            const unit = med.unit || med.Unit || '';
            const purchasePrice = parseFloat(med.purchasePrice || med.PurchasePrice || med.cost || med.Cost || 0);
            const salePrice = parseFloat(med.salePrice || med.SalePrice || med.price || med.Price || 0);
            const quantity = parseInt(med.quantity || med.Quantity || med.qty || med.Qty || 0);
            const reorderLimit = parseInt(med.reorderLimit || med.ReorderLimit || 0);
            const expiryDate = med.expiryDate || med.ExpiryDate || med.exp_date || '';
            const manufacturer = med.manufacturer || med.Manufacturer || med.company || '';

            try {
              await db.run(
                'INSERT INTO medicines (code, barcode, name, unit, purchasePrice, salePrice, quantity, reorderLimit, expiryDate, manufacturer, storeId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [code, barcode, name, unit, purchasePrice, salePrice, quantity, reorderLimit, expiryDate, manufacturer, med.storeId || 1]
              );
            } catch (insertErr: any) {
              if (insertErr.message.includes('UNIQUE constraint failed')) {
                code = code + '-' + Math.floor(Math.random() * 10000);
                await db.run(
                  'INSERT INTO medicines (code, barcode, name, unit, purchasePrice, salePrice, quantity, reorderLimit, expiryDate, manufacturer, storeId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                  [code, barcode, name, unit, purchasePrice, salePrice, quantity, reorderLimit, expiryDate, manufacturer, med.storeId || 1]
                );
              } else {
                throw insertErr;
              }
            }
            importedCount++;
          } catch (insertErr: any) {
            errors.push(`خطأ في الصنف ${med.name || 'غير معروف'}: ${insertErr.message}`);
          }
        }
        await db.exec('COMMIT');
        await logAction(req.headers['x-username'] as string, 'IMPORT_MEDICINES_DB', { count: importedCount, errors: errors.length });
        
        if (errors.length > 0 && importedCount === 0) {
           res.status(400).json({ error: 'فشل استيراد جميع الأصناف', details: errors.slice(0, 5) });
        } else {
           res.json({ success: true, count: importedCount, errors: errors.slice(0, 5) });
        }
      } catch (err) {
        await db.exec('ROLLBACK');
        throw err;
      }
    } catch (e: any) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/medicines/batch', async (req, res) => {
    const { medicines } = req.body;
    if (!Array.isArray(medicines)) {
      return res.status(400).json({ error: 'Invalid data format. Expected an array of medicines.' });
    }

    let importedCount = 0;
    let errors: string[] = [];

    await db.exec('BEGIN TRANSACTION');
    try {
      for (const med of medicines) {
        try {
          let code = med.code || med.item_code || '';
          if (!code) {
            code = 'MED-' + Math.floor(Math.random() * 1000000);
          }
          const barcode = med.barcode || '';
          const name = med.name || med.name_ar || med.name_en || 'بدون اسم';
          const unit = med.unit || '';
          const purchasePrice = parseFloat(med.purchasePrice || med.purchase_price || 0);
          const salePrice = parseFloat(med.salePrice || med.selling_price || 0);
          const quantity = parseInt(med.quantity || 0);
          const reorderLimit = parseInt(med.reorderLimit || 0);
          const expiryDate = med.expiryDate || med.expiry_date || '';
          const manufacturer = med.manufacturer || med.company || '';
          const storeId = med.storeId || 1;
          const branchId = med.branchId || 1;

          try {
            await db.run(
              'INSERT INTO medicines (code, barcode, name, unit, purchasePrice, salePrice, quantity, reorderLimit, expiryDate, manufacturer, storeId, branchId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [code, barcode, name, unit, purchasePrice, salePrice, quantity, reorderLimit, expiryDate, manufacturer, storeId, branchId]
            );
          } catch (insertErr: any) {
            if (insertErr.message.includes('UNIQUE constraint failed')) {
              code = code + '-' + Math.floor(Math.random() * 10000);
              await db.run(
                'INSERT INTO medicines (code, barcode, name, unit, purchasePrice, salePrice, quantity, reorderLimit, expiryDate, manufacturer, storeId, branchId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [code, barcode, name, unit, purchasePrice, salePrice, quantity, reorderLimit, expiryDate, manufacturer, storeId, branchId]
              );
            } else {
              throw insertErr;
            }
          }
          importedCount++;
        } catch (err: any) {
          errors.push(`خطأ في الصنف ${med.name || med.name_ar || 'غير معروف'}: ${err.message}`);
        }
      }
      await db.exec('COMMIT');
      await logAction(req.headers['x-username'] as string, 'IMPORT_MEDICINES_BATCH', { count: importedCount, errors: errors.length });
      
      res.json({ success: true, count: importedCount, errors: errors.slice(0, 10) });
    } catch (err: any) {
      await db.exec('ROLLBACK');
      res.status(500).json({ error: err.message });
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
      const { code, barcode, name, unit, purchasePrice, salePrice, quantity, reorderLimit, expiryDate, manufacturer, storeId, lastPriceUpdate } = req.body;
      
      // Check if prices changed
      const oldMed = await db.get('SELECT purchasePrice, salePrice FROM medicines WHERE id = ?', [req.params.id]);
      let newLastPriceUpdate = lastPriceUpdate;
      if (oldMed && (oldMed.purchasePrice !== purchasePrice || oldMed.salePrice !== salePrice)) {
        newLastPriceUpdate = new Date().toISOString();
      }

      await db.run(
        'UPDATE medicines SET code = ?, barcode = ?, name = ?, unit = ?, purchasePrice = ?, salePrice = ?, quantity = ?, reorderLimit = ?, expiryDate = ?, manufacturer = ?, storeId = ?, lastPriceUpdate = ? WHERE id = ?',
        [code, barcode, name, unit, purchasePrice, salePrice, quantity, reorderLimit, expiryDate, manufacturer, storeId || 1, newLastPriceUpdate, req.params.id]
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
