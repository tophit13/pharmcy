import React, { useState, useEffect } from 'react';
import { api, Sale } from '@/lib/api';
import { RotateCcw, Save, X } from 'lucide-react';
import { format } from 'date-fns';

export default function SalesReturn() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSaleId, setSelectedSaleId] = useState<number | ''>('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnItems, setReturnItems] = useState<{ id: number, quantity: number }[]>([]);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const data = await api.getSales();
      setSales(data);
    } catch (error) {
      console.error('Failed to fetch sales', error);
    }
  };

  const handleSelectSale = (id: number | '') => {
    setSelectedSaleId(id);
    if (id) {
      const sale = sales.find(s => s.id === id);
      setSelectedSale(sale || null);
      if (sale) {
        setReturnItems(sale.items.map(item => ({ id: item.medicineId, quantity: 0 })));
      }
    } else {
      setSelectedSale(null);
      setReturnItems([]);
    }
  };

  const handleReturnQuantityChange = (medicineId: number, quantity: number, maxQuantity: number) => {
    if (quantity < 0) quantity = 0;
    if (quantity > maxQuantity) quantity = maxQuantity;

    setReturnItems(prev => prev.map(item => 
      item.id === medicineId ? { ...item, quantity } : item
    ));
  };

  const handleSubmitReturn = async () => {
    if (!selectedSale) return;

    const itemsToReturn = returnItems.filter(item => item.quantity > 0);
    if (itemsToReturn.length === 0) {
      alert('الرجاء تحديد كميات للإرجاع');
      return;
    }

    if (window.confirm('هل أنت متأكد من تنفيذ عملية المرتجع؟')) {
      try {
        // In a real app, this would call a specific return API endpoint
        // For now, we'll just show a success message
        alert('تم تنفيذ عملية المرتجع بنجاح (محاكاة)');
        
        // Reset form
        setSelectedSaleId('');
        setSelectedSale(null);
        setReturnItems([]);
      } catch (error) {
        console.error('Failed to process return', error);
        alert('حدث خطأ أثناء تنفيذ المرتجع');
      }
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <RotateCcw className="w-6 h-6 text-orange-600" />
          مرتجع مبيعات
        </h1>
      </div>

      <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
        <div className="max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-1">اختر الفاتورة</label>
          <select
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            value={selectedSaleId}
            onChange={(e) => handleSelectSale(e.target.value ? parseInt(e.target.value) : '')}
          >
            <option value="">-- اختر فاتورة المبيعات --</option>
            {sales.map(s => (
              <option key={s.id} value={s.id}>
                فاتورة رقم {s.id} - {format(new Date(s.date), 'yyyy-MM-dd HH:mm')} - {s.netTotal} ج.م
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedSale && (
        <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">تفاصيل الفاتورة رقم {selectedSale.id}</h2>
            <div className="text-sm text-gray-600">
              التاريخ: {format(new Date(selectedSale.date), 'yyyy-MM-dd HH:mm')}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="p-3 font-medium">الصنف</th>
                  <th className="p-3 font-medium">السعر</th>
                  <th className="p-3 font-medium">الكمية المباعة</th>
                  <th className="p-3 font-medium">الإجمالي</th>
                  <th className="p-3 font-medium bg-orange-50 text-orange-800">كمية المرتجع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {selectedSale.items.map((item) => {
                  const returnItem = returnItems.find(ri => ri.id === item.medicineId);
                  return (
                    <tr key={item.medicineId} className="hover:bg-gray-50">
                      <td className="p-3 font-bold text-gray-900">{item.name}</td>
                      <td className="p-3 text-gray-700">{item.price.toFixed(2)}</td>
                      <td className="p-3 text-gray-700">{item.quantity}</td>
                      <td className="p-3 text-gray-700">{item.total.toFixed(2)}</td>
                      <td className="p-3 bg-orange-50">
                        <input
                          type="number"
                          min="0"
                          max={item.quantity}
                          className="w-24 p-1 border border-orange-300 rounded focus:ring-2 focus:ring-orange-500 outline-none"
                          value={returnItem?.quantity === 0 ? '' : (returnItem?.quantity || '')}
                          onChange={(e) => handleReturnQuantityChange(item.medicineId, e.target.value ? parseInt(e.target.value) : 0, item.quantity)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-4">
            <button
              onClick={() => handleSelectSale('')}
              className="flex items-center gap-2 px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
              إلغاء
            </button>
            <button
              onClick={handleSubmitReturn}
              className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
            >
              <Save className="w-5 h-5" />
              تنفيذ المرتجع
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
