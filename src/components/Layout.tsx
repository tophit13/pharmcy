import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  BarChart3, 
  Settings as SettingsIcon, 
  LogOut,
  Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Layout({ onLogout }: { onLogout: () => void }) {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'الرئيسية', icon: LayoutDashboard },
    { path: '/pos', label: 'نقطة البيع', icon: ShoppingCart },
    { path: '/inventory', label: 'المخزون', icon: Package },
    { path: '/customers', label: 'العملاء', icon: Users },
    { path: '/reports', label: 'التقارير', icon: BarChart3 },
    { path: '/ai', label: 'المساعد الذكي', icon: Bot },
    { path: '/settings', label: 'الإعدادات', icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">+</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">صيدليتي</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  isActive 
                    ? "bg-green-50 text-green-700 font-medium" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
