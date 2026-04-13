import { useState, useEffect } from 'react';
import { api, Medicine } from '@/lib/api';
import { Package, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { startOfDay, endOfDay } from 'date-fns';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const today = new Date();
      const start = startOfDay(today).getTime();
      const end = endOfDay(today).getTime();

      const allSales = await api.getSales();
      const todaySales = allSales.filter(sale => {
        const saleTime = new Date(sale.date).getTime();
        return saleTime >= start && saleTime <= end;
      });
        
      const totalSales = todaySales.reduce((sum, sale) => sum + (sale.netTotal || sale.total || 0), 0);
      
      const allMedicines = await api.getMedicines();
      const lowStock = allMedicines.filter(m => m.quantity <= (m.reorderLimit || 10));
      
      // Expiring in next 3 months
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
      const expiringSoon = allMedicines.filter(m => new Date(m.expiryDate) <= threeMonthsFromNow);

      setStats({
        totalSales,
        salesCount: todaySales.length,
        lowStockCount: lowStock.length,
        expiringCount: expiringSoon.length,
        lowStock,
        expiringSoon
      });
    };

    fetchStats();
  }, []);

  if (!stats) return <div className="p-8">جاري التحميل...</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">نظرة عامة</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">مبيعات اليوم</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalSales.toFixed(2)} ج.م</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">عدد الفواتير</p>
            <p className="text-2xl font-bold text-gray-900">{stats.salesCount}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="p-3 bg-orange-100 text-orange-600 rounded">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">نواقص (تخطت حد الطلب)</p>
            <p className="text-2xl font-bold text-gray-900">{stats.lowStockCount}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">قرب انتهاء الصلاحية</p>
            <p className="text-2xl font-bold text-gray-900">{stats.expiringCount}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low Stock Alerts */}
        <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-orange-50">
            <h2 className="text-lg font-bold text-orange-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              تنبيهات النواقص
            </h2>
          </div>
          <div className="p-0">
            {stats.lowStock.length === 0 ? (
              <p className="p-6 text-gray-500 text-center">لا توجد نواقص حالياً</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {stats.lowStock.slice(0, 5).map((med: Medicine) => (
                  <li key={med.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                    <div>
                      <p className="font-bold text-gray-900">{med.name}</p>
                      <p className="text-sm text-gray-500">{med.manufacturer}</p>
                    </div>
                    <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-bold">
                      الكمية: {med.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Expiring Soon Alerts */}
        <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-red-50">
            <h2 className="text-lg font-bold text-red-800 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              أدوية تقترب من انتهاء الصلاحية
            </h2>
          </div>
          <div className="p-0">
            {stats.expiringSoon.length === 0 ? (
              <p className="p-6 text-gray-500 text-center">لا توجد أدوية تقترب من انتهاء الصلاحية</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {stats.expiringSoon.slice(0, 5).map((med: Medicine) => (
                  <li key={med.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                    <div>
                      <p className="font-bold text-gray-900">{med.name}</p>
                      <p className="text-sm text-gray-500">الكمية: {med.quantity}</p>
                    </div>
                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">
                      {med.expiryDate}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
