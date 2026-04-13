import React, { useState, useEffect } from 'react';
import { api, DailyAccount } from '@/lib/api';
import { ArrowUpRight, Save } from 'lucide-react';
import { format } from 'date-fns';

export default function CashIn() {
  const [accounts, setAccounts] = useState<DailyAccount[]>([]);
  const [formData, setFormData] = useState({
    amount: '',
    description: ''
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const data = await api.getDailyAccounts();
      setAccounts(data.filter(a => a.type === 'IN'));
    } catch (error) {
      console.error('Failed to fetch accounts', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) {
      alert('الرجاء إدخال المبلغ والبيان');
      return;
    }

    try {
      const userStr = localStorage.getItem('user');
      const cashier = userStr ? JSON.parse(userStr).username : 'Unknown';

      await api.addDailyAccount({
        date: new Date().toISOString(),
        type: 'IN',
        amount: parseFloat(formData.amount),
        description: formData.description,
        cashier
      });

      alert('تم تسجيل عملية التوريد بنجاح');
      setFormData({ amount: '', description: '' });
      fetchAccounts();
    } catch (error) {
      console.error('Failed to save account', error);
      alert('حدث خطأ أثناء حفظ العملية');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <ArrowUpRight className="w-6 h-6 text-green-600" />
          توريد نقدية
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Form */}
        <div className="lg:col-span-1 bg-white p-4 rounded shadow-sm border border-gray-200 h-fit">
          <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">تسجيل عملية توريد</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.amount || ''}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">البيان / ملاحظات</label>
              <textarea
                required
                rows={3}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              ></textarea>
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              <Save className="w-5 h-5" />
              حفظ
            </button>
          </form>
        </div>

        {/* History */}
        <div className="lg:col-span-2 bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-800">سجل التوريدات</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-[#2E7D32] text-white">
                <tr>
                  <th className="p-3 font-medium">التاريخ</th>
                  <th className="p-3 font-medium">المبلغ</th>
                  <th className="p-3 font-medium">البيان</th>
                  <th className="p-3 font-medium">المستخدم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-gray-50">
                    <td className="p-3 text-gray-700 whitespace-nowrap">
                      {format(new Date(acc.date), 'yyyy-MM-dd HH:mm')}
                    </td>
                    <td className="p-3 font-bold text-green-600">{acc.amount.toFixed(2)}</td>
                    <td className="p-3 text-gray-700">{acc.description}</td>
                    <td className="p-3 text-gray-700">{acc.cashier}</td>
                  </tr>
                ))}
                {accounts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">
                      لا توجد عمليات توريد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
