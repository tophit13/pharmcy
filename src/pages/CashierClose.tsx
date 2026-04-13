import React, { useState, useEffect } from 'react';
import { api, DailyAccount, Sale } from '@/lib/api';
import { Lock, Printer } from 'lucide-react';
import { format } from 'date-fns';

export default function CashierClose() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [accounts, setAccounts] = useState<DailyAccount[]>([]);
  const [cashierName, setCashierName] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setCashierName(JSON.parse(userStr).username);
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const [salesData, accountsData] = await Promise.all([
        api.getSales(),
        api.getDailyAccounts()
      ]);

      // Filter for today's data for the current cashier
      const todaySales = salesData.filter(s => 
        s.date.startsWith(today) && 
        (cashierName === 'admin' || s.cashier === cashierName)
      );
      
      const todayAccounts = accountsData.filter(a => 
        a.date.startsWith(today) && 
        (cashierName === 'admin' || a.cashier === cashierName)
      );

      setSales(todaySales);
      setAccounts(todayAccounts);
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  const calculateTotals = () => {
    const cashSales = sales.filter(s => s.type === 'cash').reduce((sum, s) => sum + s.netTotal, 0);
    const visaSales = sales.filter(s => s.type === 'visa').reduce((sum, s) => sum + s.netTotal, 0);
    const creditSales = sales.filter(s => s.type === 'credit').reduce((sum, s) => sum + s.netTotal, 0);
    
    const cashIn = accounts.filter(a => a.type === 'IN').reduce((sum, a) => sum + a.amount, 0);
    const cashOut = accounts.filter(a => a.type === 'OUT').reduce((sum, a) => sum + a.amount, 0);

    const expectedCash = cashSales + cashIn - cashOut;

    return {
      cashSales,
      visaSales,
      creditSales,
      totalSales: cashSales + visaSales + creditSales,
      cashIn,
      cashOut,
      expectedCash
    };
  };

  const totals = calculateTotals();

  const handleCloseShift = () => {
    if (window.confirm('هل أنت متأكد من تقفيل الوردية؟ لن تتمكن من تعديل فواتير هذه الوردية بعد التقفيل.')) {
      alert('تم تقفيل الوردية بنجاح (محاكاة)');
      // In a real app, this would call an API to mark the shift as closed
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white p-4 rounded shadow-sm border border-gray-200 flex justify-between items-center print:hidden">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <Lock className="w-6 h-6 text-blue-600" />
          تقفيل درج الكاشير
        </h1>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            <Printer className="w-5 h-5" />
            طباعة التقرير
          </button>
          <button
            onClick={handleCloseShift}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            <Lock className="w-5 h-5" />
            تقفيل الوردية
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded shadow-sm border border-gray-200 max-w-3xl mx-auto">
        <div className="text-center mb-8 border-b pb-4">
          <h2 className="text-2xl font-bold mb-2">تقرير تقفيل الوردية</h2>
          <p className="text-gray-600">الكاشير: {cashierName}</p>
          <p className="text-gray-600">التاريخ: {format(new Date(), 'yyyy-MM-dd')}</p>
        </div>

        <div className="space-y-6">
          {/* Sales Summary */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 bg-gray-100 p-2 rounded mb-3">ملخص المبيعات</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex justify-between p-2 border-b">
                <span className="text-gray-600">مبيعات نقدية:</span>
                <span className="font-bold">{totals.cashSales.toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between p-2 border-b">
                <span className="text-gray-600">مبيعات فيزا:</span>
                <span className="font-bold">{totals.visaSales.toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between p-2 border-b">
                <span className="text-gray-600">مبيعات آجلة:</span>
                <span className="font-bold">{totals.creditSales.toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between p-2 border-b bg-blue-50">
                <span className="text-blue-800 font-bold">إجمالي المبيعات:</span>
                <span className="font-bold text-blue-900">{totals.totalSales.toFixed(2)} ج.م</span>
              </div>
            </div>
          </div>

          {/* Cash Movement */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 bg-gray-100 p-2 rounded mb-3">حركة الخزينة</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex justify-between p-2 border-b">
                <span className="text-gray-600">توريدات نقدية:</span>
                <span className="font-bold text-green-600">{totals.cashIn.toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between p-2 border-b">
                <span className="text-gray-600">مصروفات نقدية:</span>
                <span className="font-bold text-red-600">{totals.cashOut.toFixed(2)} ج.م</span>
              </div>
            </div>
          </div>

          {/* Final Expected Cash */}
          <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
            <h3 className="text-xl font-bold text-green-800 mb-2">النقدية المتوقعة بالدرج</h3>
            <p className="text-4xl font-bold text-green-900">{totals.expectedCash.toFixed(2)} ج.م</p>
            <p className="text-sm text-green-700 mt-2">
              (المبيعات النقدية + التوريدات - المصروفات)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
