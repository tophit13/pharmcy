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
    CREATE TABLE IF NOT EXISTS medicines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT,
      name TEXT,
      purchasePrice REAL,
      salePrice REAL,
      quantity INTEGER,
      expiryDate TEXT,
      manufacturer TEXT
    );
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      items TEXT,
      total REAL,
      cashier TEXT,
      customerId INTEGER
    );
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      phone TEXT,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      passwordHash TEXT,
      role TEXT
    );
  `);

  // Seed default admin
  const adminExists = await db.get('SELECT * FROM users WHERE username = ?', ['admin']);
  if (!adminExists) {
    await db.run('INSERT INTO users (username, passwordHash, role) VALUES (?, ?, ?)', ['admin', 'admin', 'pharmacist']);
  }

  // --- API Routes ---

  // Network Info
  app.get('/api/network', (req, res) => {
    res.json({ ip: ip.address(), port: PORT });
  });

  // Medicines
  app.get('/api/medicines', async (req, res) => {
    const medicines = await db.all('SELECT * FROM medicines');
    res.json(medicines);
  });

  app.post('/api/medicines', async (req, res) => {
    const { barcode, name, purchasePrice, salePrice, quantity, expiryDate, manufacturer } = req.body;
    const result = await db.run(
      'INSERT INTO medicines (barcode, name, purchasePrice, salePrice, quantity, expiryDate, manufacturer) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [barcode, name, purchasePrice, salePrice, quantity, expiryDate, manufacturer]
    );
    res.json({ id: result.lastID });
  });

  app.put('/api/medicines/:id', async (req, res) => {
    const { barcode, name, purchasePrice, salePrice, quantity, expiryDate, manufacturer } = req.body;
    await db.run(
      'UPDATE medicines SET barcode = ?, name = ?, purchasePrice = ?, salePrice = ?, quantity = ?, expiryDate = ?, manufacturer = ? WHERE id = ?',
      [barcode, name, purchasePrice, salePrice, quantity, expiryDate, manufacturer, req.params.id]
    );
    res.json({ success: true });
  });

  app.delete('/api/medicines/:id', async (req, res) => {
    await db.run('DELETE FROM medicines WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  });

  // Sales
  app.get('/api/sales', async (req, res) => {
    const sales = await db.all('SELECT * FROM sales');
    // Parse items JSON
    const parsedSales = sales.map(s => ({ ...s, items: JSON.parse(s.items) }));
    res.json(parsedSales);
  });

  app.post('/api/sales', async (req, res) => {
    const { date, items, total, cashier, customerId } = req.body;
    
    // Start transaction
    await db.exec('BEGIN TRANSACTION');
    try {
      // Deduct inventory
      for (const item of items) {
        await db.run('UPDATE medicines SET quantity = quantity - ? WHERE id = ?', [item.quantity, item.medicineId]);
      }
      
      // Record sale
      const result = await db.run(
        'INSERT INTO sales (date, items, total, cashier, customerId) VALUES (?, ?, ?, ?, ?)',
        [date, JSON.stringify(items), total, cashier, customerId]
      );
      
      await db.exec('COMMIT');
      res.json({ id: result.lastID });
    } catch (error) {
      await db.exec('ROLLBACK');
      res.status(500).json({ error: 'Transaction failed' });
    }
  });

  // Customers
  app.get('/api/customers', async (req, res) => {
    const customers = await db.all('SELECT * FROM customers');
    res.json(customers);
  });

  app.post('/api/customers', async (req, res) => {
    const { name, phone, notes } = req.body;
    const result = await db.run('INSERT INTO customers (name, phone, notes) VALUES (?, ?, ?)', [name, phone, notes]);
    res.json({ id: result.lastID });
  });

  app.put('/api/customers/:id', async (req, res) => {
    const { name, phone, notes } = req.body;
    await db.run('UPDATE customers SET name = ?, phone = ?, notes = ? WHERE id = ?', [name, phone, notes, req.params.id]);
    res.json({ success: true });
  });

  app.delete('/api/customers/:id', async (req, res) => {
    await db.run('DELETE FROM customers WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  });

  // Users (Login)
  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await db.get('SELECT * FROM users WHERE username = ? AND passwordHash = ?', [username, password]);
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  // Export/Import
  app.get('/api/export', async (req, res) => {
    const medicines = await db.all('SELECT * FROM medicines');
    const sales = await db.all('SELECT * FROM sales');
    const customers = await db.all('SELECT * FROM customers');
    const users = await db.all('SELECT * FROM users');
    
    res.json({
      medicines,
      sales: sales.map(s => ({ ...s, items: JSON.parse(s.items) })),
      customers,
      users
    });
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
        await db.run('INSERT INTO sales (id, date, items, total, cashier, customerId) VALUES (?, ?, ?, ?, ?, ?)', 
          [s.id, s.date, JSON.stringify(s.items), s.total, s.cashier, s.customerId]);
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
