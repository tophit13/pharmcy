import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  LogOut,
  User,
  Clock,
  Calendar,
  Monitor,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useBranch } from '@/contexts/BranchContext';

export default function Layout({ onLogout }: { onLogout: () => void }) {
  const location = useLocation();
  const [time, setTime] = useState(new Date());
  const [user, setUser] = useState<{username: string, role: string} | null>(null);
  const [loginTime] = useState(new Date());
  const { branches, selectedBranch, setSelectedBranch } = useBranch();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    const userStr = localStorage.getItem('user');
    if (userStr) setUser(JSON.parse(userStr));
    return () => clearInterval(timer);
  }, []);

  const menus = [
    {
      title: 'البيانات العامة',
      items: [
        { label: 'بيانات الصيدلية', path: '/pharmacy-info' },
        { label: 'بيانات المستخدمين', path: '/users' },
        { label: 'طباعة باركود', path: '/barcode' },
      ]
    },
    {
      title: 'الأصناف',
      items: [
        { label: 'قائمة الأصناف', path: '/inventory' },
        { label: 'إضافة صنف جديد', path: '/inventory/add' },
      ]
    },
    {
      title: 'المخازن',
      items: [
        { label: 'المخازن الداخلية', path: '/stores' },
        { label: 'استلام طلبية', path: '/inventory/receive' },
        { label: 'نقل مخزون', path: '/inventory/transfer' },
        { label: 'تنبيهات المخزون', path: '/inventory/alerts' },
        { label: 'تقرير حركة صنف', path: '/reports/item-movement' },
      ]
    },
    {
      title: 'الموردين',
      items: [
        { label: 'قائمة الموردين', path: '/suppliers' },
        { label: 'كشف حساب مورد', path: '/suppliers/statement' },
      ]
    },
    {
      title: 'المشتريات',
      items: [
        { label: 'فاتورة شراء', path: '/purchases/new' },
        { label: 'مرتجع شراء', path: '/purchases/return' },
      ]
    },
    {
      title: 'العملاء',
      items: [
        { label: 'قائمة العملاء', path: '/customers' },
        { label: 'كشف حساب عميل', path: '/customers/statement' },
      ]
    },
    {
      title: 'المبيعات',
      items: [
        { label: 'فاتورة المبيعات', path: '/pos' },
        { label: 'مرتجع المبيعات', path: '/pos/return' },
        { label: 'تقفيل درج الكاشير', path: '/pos/close' },
      ]
    },
    {
      title: 'الحسابات اليومية',
      items: [
        { label: 'صرف نقدية', path: '/accounts/out' },
        { label: 'توريد نقدية', path: '/accounts/in' },
      ]
    },
    {
      title: 'رئيسى وفروع',
      items: [
        { label: 'فروع المؤسسة', path: '/branches' },
        { label: 'تنبيهات شاملة (جميع الفروع)', path: '/reports/global-alerts' },
      ]
    },
    {
      title: 'إطار',
      items: [
        { label: 'إعدادات النظام', path: '/settings' },
        { label: 'عن البرنامج', path: '/about' },
        { label: 'المساعد الذكي', path: '/ai' },
        { label: 'سجل النشاطات', path: '/audit-logs' },
      ]
    }
  ];

  const currentScreenName = menus.flatMap(m => m.items).find(i => i.path === location.pathname)?.label || 'الرئيسية';

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#f0f0f0] font-sans">
      {/* Top Menu Bar - Orange */}
      <header className="bg-[#FF8C00] text-white shadow-md z-10 flex items-center justify-between px-2 h-10 text-sm">
        <div className="flex items-center space-x-reverse space-x-4">
          {menus.map((menu, idx) => (
            <div key={idx} className="relative group cursor-pointer hover:bg-orange-600 px-2 py-1 rounded">
              <span>{menu.title}</span>
              <div className="absolute top-full right-0 mt-0 w-48 bg-white text-black shadow-lg border border-gray-300 hidden group-hover:block z-50">
                {menu.items.map((item, i) => (
                  <Link 
                    key={i} 
                    to={item.path}
                    className="block px-4 py-2 hover:bg-blue-100 hover:text-blue-900 text-right"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded">
            <MapPin className="w-4 h-4" />
            <select 
              className="bg-transparent text-white outline-none cursor-pointer [&>option]:text-black"
              value={selectedBranch?.id || ''}
              onChange={(e) => {
                const branch = branches.find(b => b.id === Number(e.target.value));
                if (branch) setSelectedBranch(branch);
              }}
            >
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.name || 'فرع بدون اسم'}
                </option>
              ))}
            </select>
          </div>
          <button onClick={onLogout} className="hover:bg-orange-600 px-2 py-1 rounded flex items-center gap-1">
            <LogOut className="w-4 h-4" />
            خروج
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-white m-1 border border-gray-300 shadow-inner">
        <Outlet />
      </main>

      {/* Bottom Status Bar */}
      <footer className="bg-gray-200 border-t border-gray-300 h-8 flex items-center justify-between px-4 text-xs text-gray-700">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            <span className="font-bold">{user?.username || 'غير معروف'}</span>
            <span className="text-gray-500">({user?.role === 'admin' ? 'مدير' : 'مستخدم'})</span>
          </div>
          <div className="w-px h-4 bg-gray-400"></div>
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-gray-500" />
            <span>الشاشة الحالية: <span className="font-bold text-blue-700">{currentScreenName}</span></span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span>وقت الدخول: {format(loginTime, 'hh:mm a', { locale: ar })}</span>
          </div>
          <div className="w-px h-4 bg-gray-400"></div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span>{format(time, 'dd/MM/yyyy')}</span>
            <span className="font-bold ml-2">{format(time, 'hh:mm:ss a', { locale: ar })}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
