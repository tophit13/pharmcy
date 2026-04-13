import React, { useState, useEffect } from 'react';
import { api, Customer, Sale } from '@/lib/api';
import { FileText, Search, Printer, Download } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

export default function CustomerStatement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [customersData, salesData] = await Promise.all([
        api.getCustomers(),
        api.getSales()
      ]);
      setCustomers(customersData);
      setSales(salesData);
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  const handleSearch = () => {
    if (!selectedCustomerId) {
      alert('الرجاء اختيار عميل');
      return;
    }

    let filtered = sales.filter(s => s.customerId === selectedCustomerId);

    if (startDate) {
      filtered = filtered.filter(s => new Date(s.date) >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter(s => new Date(s.date) <= new Date(endDate + 'T23:59:59'));
    }

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setFilteredSales(filtered);
  };

  const handleExportExcel = () => {
    if (filteredSales.length === 0) return;

    const exportData = filteredSales.map(s => ({
      'رقم الفاتورة': s.id,
      'التاريخ': format(new Date(s.date), 'yyyy-MM-dd HH:mm'),
      'النوع': s.type === 'cash' ? 'نقدي' : s.type === 'visa' ? 'فيزا' : 'آجل',
      'الإجمالي': s.totalBeforeDiscount,
      'الخصم': s.discountValue,
      'الصافي': s.netTotal,
      'المستخدم': s.cashier
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customer Statement");
    XLSX.writeFile(wb, `كشف_حساب_عميل_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  const totalSales = filteredSales.reduce((sum, s) => sum + s.netTotal, 0);
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white p-4 rounded shadow-sm border border-gray-200 flex justify-between items-center print:hidden">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <FileText className="w-6 h-6 text-blue-600" />
          كشف حساب عميل
        </h1>
        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            disabled={filteredSales.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Download className="w-5 h-5" />
            تصدير Excel
          </button>
          <button
            onClick={handlePrint}
            disabled={filteredSales.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Printer className="w-5 h-5" />
            طباعة
          </button>
        </div>
      </div>

      {/* Search Filters */}
      <div className="bg-white p-4 rounded shadow-sm border border-gray-200 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">العميل</label>
            <select
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value ? parseInt(e.target.value) : '')}
            >
              <option value="">-- اختر العميل --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} - {c.phone}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
            <input
              type="date"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
            <input
              type="date"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="md:col-span-4 flex justify-end">
            <button
              onClick={handleSearch}
              className="flex items-center gap-2 px-6 py-2 bg-[#2E7D32] text-white rounded hover:bg-green-800 transition-colors"
            >
              <Search className="w-5 h-5" />
              بحث
            </button>
          </div>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-6">
        <h2 className="text-2xl font-bold">كشف حساب عميل</h2>
        {selectedCustomer && (
          <div className="mt-4 text-right">
            <p className="text-lg font-bold">اسم العميل: {selectedCustomer.name}</p>
            <p>التليفون: {selectedCustomer.phone}</p>
            <p>الرصيد الحالي: {selectedCustomer.balance?.toFixed(2)} ج.م</p>
          </div>
        )}
        <p className="text-sm mt-2 text-gray-600">
          الفترة: {startDate || 'بداية المدة'} إلى {endDate || 'تاريخه'}
        </p>
      </div>

      {/* Summary Cards */}
      {filteredSales.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded border border-blue-200">
            <h3 className="text-blue-800 font-bold mb-1">إجمالي المبيعات</h3>
            <p className="text-2xl font-bold text-blue-900">{totalSales.toFixed(2)} ج.م</p>
          </div>
          <div className="bg-green-50 p-4 rounded border border-green-200">
            <h3 className="text-green-800 font-bold mb-1">عدد الفواتير</h3>
            <p className="text-2xl font-bold text-green-900">{filteredSales.length}</p>
          </div>
          <div className="bg-orange-50 p-4 rounded border border-orange-200">
            <h3 className="text-orange-800 font-bold mb-1">الرصيد الحالي للعميل</h3>
            <p className="text-2xl font-bold text-orange-900">{selectedCustomer?.balance?.toFixed(2) || 0} ج.م</p>
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="bg-white rounded shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-[#2E7D32] text-white">
            <tr>
              <th className="p-3 font-medium">رقم الفاتورة</th>
              <th className="p-3 font-medium">التاريخ</th>
              <th className="p-3 font-medium">النوع</th>
              <th className="p-3 font-medium">الإجمالي</th>
              <th className="p-3 font-medium">الخصم</th>
              <th className="p-3 font-medium">الصافي</th>
              <th className="p-3 font-medium">المستخدم</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredSales.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="p-3 text-gray-700">#{s.id}</td>
                <td className="p-3 text-gray-700 whitespace-nowrap">
                  {format(new Date(s.date), 'yyyy-MM-dd HH:mm')}
                </td>
                <td className="p-3 text-gray-700">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    s.type === 'cash' ? 'bg-green-100 text-green-800' : 
                    s.type === 'visa' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                  }`}>
                    {s.type === 'cash' ? 'نقدي' : s.type === 'visa' ? 'فيزا' : 'آجل'}
                  </span>
                </td>
                <td className="p-3 text-gray-700">{s.totalBeforeDiscount.toFixed(2)}</td>
                <td className="p-3 text-gray-700">{s.discountValue.toFixed(2)}</td>
                <td className="p-3 font-bold text-gray-900">{s.netTotal.toFixed(2)}</td>
                <td className="p-3 text-gray-700">{s.cashier}</td>
              </tr>
            ))}
            {filteredSales.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  لا توجد فواتير لهذا العميل في الفترة المحددة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
