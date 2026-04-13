import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import POS from './pages/POS';
import Reports from './pages/Reports';
import Customers from './pages/Customers';
import Settings from './pages/Settings';
import AIAssistant from './pages/AIAssistant';

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
              <Route path="pos" element={<POS />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="reports" element={<Reports />} />
              <Route path="customers" element={<Customers />} />
              <Route path="settings" element={<Settings />} />
              <Route path="ai" element={<AIAssistant />} />
            </Route>
          ) : (
            <Route path="*" element={<Navigate to="/login" />} />
          )}
        </Routes>
      </div>
    </Router>
  );
}
