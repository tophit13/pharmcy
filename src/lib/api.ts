export interface Medicine {
  id?: number;
  barcode: string;
  name: string;
  purchasePrice: number;
  salePrice: number;
  quantity: number;
  expiryDate: string;
  manufacturer: string;
}

export interface SaleItem {
  medicineId: number;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Sale {
  id?: number;
  date: string;
  items: SaleItem[];
  total: number;
  cashier: string;
  customerId?: number;
}

export interface Customer {
  id?: number;
  name: string;
  phone: string;
  notes: string;
}

export interface User {
  id?: number;
  username: string;
  passwordHash: string;
  role: 'pharmacist' | 'cashier';
}

const API_URL = 'http://localhost:3000/api';

export const api = {
  // Network
  getNetworkInfo: async () => {
    const res = await fetch(`${API_URL}/network`);
    return res.json();
  },

  // Medicines
  getMedicines: async (): Promise<Medicine[]> => {
    const res = await fetch(`${API_URL}/medicines`);
    return res.json();
  },
  addMedicine: async (med: Medicine) => {
    const res = await fetch(`${API_URL}/medicines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(med)
    });
    return res.json();
  },
  updateMedicine: async (id: number, med: Medicine) => {
    const res = await fetch(`${API_URL}/medicines/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(med)
    });
    return res.json();
  },
  deleteMedicine: async (id: number) => {
    const res = await fetch(`${API_URL}/medicines/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Sales
  getSales: async (): Promise<Sale[]> => {
    const res = await fetch(`${API_URL}/sales`);
    return res.json();
  },
  addSale: async (sale: Sale) => {
    const res = await fetch(`${API_URL}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sale)
    });
    return res.json();
  },

  // Customers
  getCustomers: async (): Promise<Customer[]> => {
    const res = await fetch(`${API_URL}/customers`);
    return res.json();
  },
  addCustomer: async (customer: Customer) => {
    const res = await fetch(`${API_URL}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer)
    });
    return res.json();
  },
  updateCustomer: async (id: number, customer: Customer) => {
    const res = await fetch(`${API_URL}/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer)
    });
    return res.json();
  },
  deleteCustomer: async (id: number) => {
    const res = await fetch(`${API_URL}/customers/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Users
  login: async (username: string, passwordHash: string): Promise<User> => {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: passwordHash })
    });
    if (!res.ok) throw new Error('Invalid credentials');
    return res.json();
  },

  // Export/Import
  exportData: async () => {
    const res = await fetch(`${API_URL}/export`);
    return res.json();
  },
  importData: async (data: any) => {
    const res = await fetch(`${API_URL}/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  }
};
