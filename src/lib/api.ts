export interface Medicine {
  id?: number;
  code?: string;
  barcode: string;
  name: string;
  unit?: string;
  purchasePrice: number;
  salePrice: number;
  quantity: number;
  reorderLimit?: number;
  expiryDate: string;
  manufacturer: string;
  storeId?: number;
}

export interface SaleItem {
  medicineId: number;
  name: string;
  quantity: number;
  price: number;
  total: number;
  discountPercent?: number;
  discountValue?: number;
}

export interface Sale {
  id?: number;
  date: string;
  type: 'cash' | 'visa' | 'credit';
  items: SaleItem[];
  totalBeforeDiscount: number;
  discountPercent: number;
  discountValue: number;
  netTotal: number;
  cashier: string;
  customerId?: number;
  storeId?: number;
}

export interface Purchase {
  id?: number;
  date: string;
  type: 'cash' | 'credit';
  items: SaleItem[];
  totalBeforeDiscount: number;
  discountPercent: number;
  discountValue: number;
  netTotal: number;
  cashier: string;
  supplierId?: number;
  storeId?: number;
}

export interface Customer {
  id?: number;
  name: string;
  phone: string;
  notes: string;
  balance?: number;
}

export interface Supplier {
  id?: number;
  name: string;
  phone: string;
  company: string;
  balance?: number;
}

export interface User {
  id?: number;
  username: string;
  passwordHash?: string;
  role: 'admin' | 'pharmacist' | 'cashier' | string;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  username: string;
  action: string;
  details: string;
}

export interface DailyAccount {
  id: number;
  date: string;
  type: 'IN' | 'OUT';
  amount: number;
  description: string;
  cashier: string;
}

export interface Branch {
  id: number;
  name: string;
  address: string;
  phone: string;
}

export interface Store {
  id: number;
  name: string;
  branchId: number;
}

export interface Settings {
  pharmacyName?: string;
  address?: string;
  phone?: string;
  manager?: string;
  license?: string;
  [key: string]: string | undefined;
}

const API_URL = '/api';

const getHeaders = () => {
  const userStr = localStorage.getItem('user');
  const username = userStr ? JSON.parse(userStr).username : 'Unknown';
  return {
    'Content-Type': 'application/json',
    'X-Username': encodeURIComponent(username)
  };
};

export const api = {
  // Network
  getNetworkInfo: async () => {
    const res = await fetch(`${API_URL}/network`);
    return res.json();
  },

  // Audit Logs
  getAuditLogs: async (): Promise<AuditLog[]> => {
    const res = await fetch(`${API_URL}/audit-logs`, { headers: getHeaders() });
    return res.json();
  },

  // Medicines
  getMedicines: async (): Promise<Medicine[]> => {
    const res = await fetch(`${API_URL}/medicines`, { headers: getHeaders() });
    return res.json();
  },
  addMedicine: async (med: Medicine) => {
    const res = await fetch(`${API_URL}/medicines`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(med)
    });
    return res.json();
  },
  updateMedicine: async (id: number, med: Medicine) => {
    const res = await fetch(`${API_URL}/medicines/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(med)
    });
    return res.json();
  },
  deleteMedicine: async (id: number) => {
    const res = await fetch(`${API_URL}/medicines/${id}`, { 
      method: 'DELETE',
      headers: getHeaders()
    });
    return res.json();
  },

  // Sales
  getSales: async (): Promise<Sale[]> => {
    const res = await fetch(`${API_URL}/sales`, { headers: getHeaders() });
    return res.json();
  },
  addSale: async (sale: Sale) => {
    const res = await fetch(`${API_URL}/sales`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(sale)
    });
    return res.json();
  },

  // Purchases
  getPurchases: async (): Promise<Purchase[]> => {
    const res = await fetch(`${API_URL}/purchases`, { headers: getHeaders() });
    return res.json();
  },
  addPurchase: async (purchase: Purchase) => {
    const res = await fetch(`${API_URL}/purchases`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(purchase)
    });
    return res.json();
  },

  // Suppliers
  getSuppliers: async (): Promise<Supplier[]> => {
    const res = await fetch(`${API_URL}/suppliers`, { headers: getHeaders() });
    return res.json();
  },
  addSupplier: async (supplier: Supplier) => {
    const res = await fetch(`${API_URL}/suppliers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(supplier)
    });
    return res.json();
  },
  updateSupplier: async (id: number, supplier: Supplier) => {
    const res = await fetch(`${API_URL}/suppliers/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(supplier)
    });
    return res.json();
  },
  deleteSupplier: async (id: number) => {
    const res = await fetch(`${API_URL}/suppliers/${id}`, { 
      method: 'DELETE',
      headers: getHeaders()
    });
    return res.json();
  },

  // Customers
  getCustomers: async (): Promise<Customer[]> => {
    const res = await fetch(`${API_URL}/customers`, { headers: getHeaders() });
    return res.json();
  },
  addCustomer: async (customer: Customer) => {
    const res = await fetch(`${API_URL}/customers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(customer)
    });
    return res.json();
  },
  updateCustomer: async (id: number, customer: Customer) => {
    const res = await fetch(`${API_URL}/customers/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(customer)
    });
    return res.json();
  },
  deleteCustomer: async (id: number) => {
    const res = await fetch(`${API_URL}/customers/${id}`, { 
      method: 'DELETE',
      headers: getHeaders()
    });
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
  getUsers: async (): Promise<User[]> => {
    const res = await fetch(`${API_URL}/users`, { headers: getHeaders() });
    return res.json();
  },
  addUser: async (user: any): Promise<{ id: number }> => {
    const res = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(user),
    });
    return res.json();
  },
  updateUser: async (id: number, user: any): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(user),
    });
    return res.json();
  },
  deleteUser: async (id: number): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return res.json();
  },

  // Stores
  getStores: async (): Promise<Store[]> => {
    const res = await fetch(`${API_URL}/stores`, { headers: getHeaders() });
    return res.json();
  },
  addStore: async (store: any): Promise<{ id: number }> => {
    const res = await fetch(`${API_URL}/stores`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(store),
    });
    return res.json();
  },
  updateStore: async (id: number, store: any): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_URL}/stores/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(store),
    });
    return res.json();
  },
  deleteStore: async (id: number): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_URL}/stores/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return res.json();
  },

  // Branches
  getBranches: async (): Promise<Branch[]> => {
    const res = await fetch(`${API_URL}/branches`, { headers: getHeaders() });
    return res.json();
  },
  addBranch: async (branch: any): Promise<{ id: number }> => {
    const res = await fetch(`${API_URL}/branches`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(branch),
    });
    return res.json();
  },
  updateBranch: async (id: number, branch: any): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_URL}/branches/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(branch),
    });
    return res.json();
  },
  deleteBranch: async (id: number): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_URL}/branches/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return res.json();
  },

  // Daily Accounts
  getDailyAccounts: async (): Promise<DailyAccount[]> => {
    const res = await fetch(`${API_URL}/daily-accounts`, { headers: getHeaders() });
    return res.json();
  },
  addDailyAccount: async (account: any): Promise<{ id: number }> => {
    const res = await fetch(`${API_URL}/daily-accounts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(account),
    });
    return res.json();
  },

  // Settings
  getSettings: async (): Promise<Settings> => {
    const res = await fetch(`${API_URL}/settings`, { headers: getHeaders() });
    return res.json();
  },
  updateSettings: async (settings: Settings): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_URL}/settings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(settings),
    });
    return res.json();
  },

  // Export/Import
  exportData: async () => {
    const res = await fetch(`${API_URL}/export`, { headers: getHeaders() });
    return res.json();
  },
  importData: async (data: any) => {
    const res = await fetch(`${API_URL}/import`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  }
};
