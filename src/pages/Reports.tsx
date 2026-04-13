import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function Reports() {
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    const fetchReport = async () => {
      const date = new Date(selectedDate);
      let start, end;

      if (reportType === 'daily') {
        start = startOfDay(date).getTime();
        end = endOfDay(date).getTime();
      } else {
        start = startOfMonth(date).getTime();
        end = endOfMonth(date).getTime();
      }

      const allSales = await api.getSales();
      const sales = allSales.filter(sale => {
        const saleTime = new Date(sale.date).getTime();
        return saleTime >= start && saleTime <= end;
      });

      const allMedicines = await api.getMedicines();
      const medicinesMap = new Map(allMedicines.map(m => [m.id, m]));

      let totalRevenue = 0;
      let totalCost = 0;
      const itemSales: Record<string, { name: string, quantity: number, revenue: number }> = {};

      for (const sale of sales) {
        totalRevenue += sale.total;
        for (const item of sale.items) {
          const med = medicinesMap.get(item.medicineId);
          if (med) {
            totalCost += med.purchasePrice * item.quantity;
          }

          if (!itemSales[item.medicineId]) {
            itemSales[item.medicineId] = { name: item.name, quantity: 0, revenue: 0 };
          }
          itemSales[item.medicineId].quantity += item.quantity;
          itemSales[item.medicineId].revenue += item.total;
        }
      }

      const profit = totalRevenue - totalCost;
      const topItems = Object.values(itemSales).sort((a, b) => b.quantity - a.quantity).slice(0, 10);

      setReportData({
        sales,
        totalRevenue,
        profit,
        topItems
      });
    };

    fetchReport();
  }, [reportType, selectedDate]);

  if (!reportData) return <div className="p-8">جاري التحميل...</div>;

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">التقارير</h1>
        <div className="flex gap-4">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as 'daily' | 'monthly')}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
          >
            <option value="daily">يومي</option>
            <option value="monthly">شهري</option>
          </select>
          <input
            type={reportType === 'daily' ? 'date' : 'month'}
            value={reportType === 'daily' ? selectedDate : selectedDate.substring(0, 7)}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedDate(reportType === 'daily' ? val : `${val}-01`);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium mb-2">إجمالي المبيعات</p>
          <p className="text-3xl font-bold text-gray-900">{reportData.totalRevenue.toFixed(2)} ج.م</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium mb-2">إجمالي الأرباح</p>
          <p className="text-3xl font-bold text-green-600">{reportData.profit.toFixed(2)} ج.م</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium mb-2">عدد الفواتير</p>
          <p className="text-3xl font-bold text-blue-600">{reportData.sales.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900">الأدوية الأكثر مبيعاً</h2>
          </div>
          <div className="p-0">
            {reportData.topItems.length === 0 ? (
              <p className="p-6 text-gray-500 text-center">لا توجد مبيعات في هذه الفترة</p>
            ) : (
              <table className="w-full text-right">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="p-4 font-medium text-gray-600">اسم الدواء</th>
                    <th className="p-4 font-medium text-gray-600">الكمية المباعة</th>
                    <th className="p-4 font-medium text-gray-600">الإيرادات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reportData.topItems.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-4 font-medium text-gray-900">{item.name}</td>
                      <td className="p-4 text-gray-600">{item.quantity}</td>
                      <td className="p-4 text-green-600 font-medium">{item.revenue.toFixed(2)} ج.م</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900">سجل الفواتير</h2>
          </div>
          <div className="p-0 max-h-[500px] overflow-y-auto">
            {reportData.sales.length === 0 ? (
              <p className="p-6 text-gray-500 text-center">لا توجد فواتير في هذه الفترة</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {reportData.sales.slice().reverse().map((sale: any) => (
                  <li key={sale.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-gray-900">فاتورة #{sale.id}</span>
                      <span className="text-sm text-gray-500">
                        {format(new Date(sale.date), 'PPp', { locale: ar })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">الكاشير: {sale.cashier}</span>
                      <span className="font-bold text-green-600">{sale.total.toFixed(2)} ج.م</span>
                    </div>
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
