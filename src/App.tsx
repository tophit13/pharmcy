import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import SalesInvoice from './pages/SalesInvoice';
import PurchaseInvoice from './pages/PurchaseInvoice';
import Reports from './pages/Reports';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Settings from './pages/Settings';
import AIAssistant from './pages/AIAssistant';
import AuditLogs from './pages/AuditLogs';
import Users from './pages/Users';
import BarcodePrint from './pages/BarcodePrint';
import Stores from './pages/Stores';
import Branches from './pages/Branches';
import CashOut from './pages/CashOut';
import CashIn from './pages/CashIn';
import PharmacyInfo from './pages/PharmacyInfo';
import AddItem from './pages/AddItem';
import ItemMovement from './pages/ItemMovement';
import SupplierStatement from './pages/SupplierStatement';
import PurchaseReturn from './pages/PurchaseReturn';
import CustomerStatement from './pages/CustomerStatement';
import SalesReturn from './pages/SalesReturn';
import CashierClose from './pages/CashierClose';
import About from './pages/About';

import { BranchProvider } from './contexts/BranchContext';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      setIsAuthenticated(true);
    }
  }, []);

  return (
    <Router>
      <BranchProvider>
        <div dir="rtl" className="min-h-screen bg-gray-50 font-sans text-gray-900">
          <Routes>
            <Route 
              path="/login" 
              element={!isAuthenticated ? <Login onLogin={() => setIsAuthenticated(true)} /> : <Navigate to="/" />} 
            />
            
            {isAuthenticated ? (
              <Route path="/" element={<Layout onLogout={() => {
                localStorage.removeItem('user');
                setIsAuthenticated(false);
              }} />}>
                <Route index element={<Dashboard />} />
                <Route path="pos" element={<SalesInvoice />} />
                <Route path="purchases/new" element={<PurchaseInvoice />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="reports" element={<Reports />} />
                <Route path="customers" element={<Customers />} />
                <Route path="suppliers" element={<Suppliers />} />
                <Route path="audit-logs" element={<AuditLogs />} />
                <Route path="settings" element={<Settings />} />
                <Route path="ai" element={<AIAssistant />} />
                
                {/* Newly implemented routes */}
                <Route path="users" element={<Users />} />
                <Route path="barcode" element={<BarcodePrint />} />
                <Route path="stores" element={<Stores />} />
                <Route path="branches" element={<Branches />} />
                <Route path="accounts/out" element={<CashOut />} />
                <Route path="accounts/in" element={<CashIn />} />
                <Route path="pharmacy-info" element={<PharmacyInfo />} />
                <Route path="inventory/add" element={<AddItem />} />
                <Route path="reports/item-movement" element={<ItemMovement />} />
                <Route path="suppliers/statement" element={<SupplierStatement />} />
                <Route path="purchases/return" element={<PurchaseReturn />} />
                <Route path="customers/statement" element={<CustomerStatement />} />
                <Route path="pos/return" element={<SalesReturn />} />
                <Route path="pos/close" element={<CashierClose />} />
                <Route path="about" element={<About />} />
              </Route>
            ) : (
              <Route path="*" element={<Navigate to="/login" />} />
            )}
          </Routes>
        </div>
      </BranchProvider>
    </Router>
  );
}
