import React, { useState, useEffect } from 'react';
import { api, Medicine, AuditLog } from '@/lib/api';
import { Activity, Search, Printer, Download } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

export default function ItemMovement() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [selectedMedicineId, setSelectedMedicineId] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [medsData, logsData] = await Promise.all([
        api.getMedicines(),
        api.getAuditLogs()
      ]);
      setMedicines(medsData);
      setLogs(logsData);
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  const handleSearch = () => {
    if (!selectedMedicineId) {
      alert('الرجاء اختيار صنف');
      return;
    }

    const selectedMed = medicines.find(m => m.id === selectedMedicineId);
    if (!selectedMed) return;

    let filtered = logs.filter(log => {
      // Check if log details contain the medicine name or code
      const detailsLower = log.details.toLowerCase();
      const medNameLower = selectedMed.name.toLowerCase();
      const medCodeLower = (selectedMed.code || '').toLowerCase();
      
      const involvesMedicine = detailsLower.includes(medNameLower) || 
                               (medCodeLower && detailsLower.includes(medCodeLower));

      if (!involvesMedicine) return false;

      // Date filtering
      if (startDate && new Date(log.timestamp) < new Date(startDate)) return false;
      if (endDate && new Date(log.timestamp) > new Date(endDate + 'T23:59:59')) return false;

      return true;
    });

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    setFilteredLogs(filtered);
  };

  const handleExportExcel = () => {
    if (filteredLogs.length === 0) return;

    const exportData = filteredLogs.map(log => ({
      'التاريخ': format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm'),
      'المستخدم': log.username,
      'نوع الحركة': log.action,
      'التفاصيل': log.details
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Item Movement");
    XLSX.writeFile(wb, `حركة_صنف_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white p-4 rounded shadow-sm border border-gray-200 flex justify-between items-center print:hidden">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <Activity className="w-6 h-6 text-blue-600" />
          تقرير حركة صنف
        </h1>
        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Download className="w-5 h-5" />
            تصدير Excel
          </button>
          <button
            onClick={handlePrint}
            disabled={filteredLogs.length === 0}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">الصنف</label>
            <select
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              value={selectedMedicineId}
              onChange={(e) => setSelectedMedicineId(e.target.value ? parseInt(e.target.value) : '')}
            >
              <option value="">-- اختر الصنف --</option>
              {medicines.map(med => (
                <option key={med.id} value={med.id}>
                  {med.code} - {med.name}
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
        <h2 className="text-2xl font-bold">تقرير حركة صنف</h2>
        {selectedMedicineId && (
          <p className="text-lg mt-2">
            الصنف: {medicines.find(m => m.id === selectedMedicineId)?.name}
          </p>
        )}
        <p className="text-sm mt-1 text-gray-600">
          الفترة: {startDate || 'بداية المدة'} إلى {endDate || 'تاريخه'}
        </p>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-[#2E7D32] text-white">
            <tr>
              <th className="p-3 font-medium">التاريخ</th>
              <th className="p-3 font-medium">المستخدم</th>
              <th className="p-3 font-medium">نوع الحركة</th>
              <th className="p-3 font-medium">التفاصيل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="p-3 text-gray-700 whitespace-nowrap">
                  {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm')}
                </td>
                <td className="p-3 font-bold text-gray-900">{log.username}</td>
                <td className="p-3 text-gray-700">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    log.action.includes('بيع') ? 'bg-green-100 text-green-800' :
                    log.action.includes('شراء') ? 'bg-blue-100 text-blue-800' :
                    log.action.includes('حذف') ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {log.action}
                  </span>
                </td>
                <td className="p-3 text-gray-700">{log.details}</td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  لا توجد حركات لهذا الصنف في الفترة المحددة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
