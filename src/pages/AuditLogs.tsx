import React, { useState, useEffect } from 'react';
import { api, AuditLog } from '@/lib/api';
import { ClipboardList, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const ACTION_MAP: Record<string, string> = {
  'ADD_MEDICINE': 'إضافة دواء',
  'UPDATE_MEDICINE': 'تعديل دواء',
  'DELETE_MEDICINE': 'حذف دواء',
  'ADD_SALE': 'عملية بيع',
  'ADD_PURCHASE': 'عملية شراء',
  'ADD_CUSTOMER': 'إضافة عميل',
  'UPDATE_CUSTOMER': 'تعديل عميل',
  'DELETE_CUSTOMER': 'حذف عميل',
  'ADD_SUPPLIER': 'إضافة مورد',
  'UPDATE_SUPPLIER': 'تعديل مورد',
  'DELETE_SUPPLIER': 'حذف مورد',
  'LOGIN': 'تسجيل دخول',
  'EXPORT_DATA': 'تصدير بيانات',
  'IMPORT_DATA': 'استيراد بيانات',
};

const ACTION_COLORS: Record<string, string> = {
  'ADD_MEDICINE': 'bg-green-100 text-green-800',
  'UPDATE_MEDICINE': 'bg-blue-100 text-blue-800',
  'DELETE_MEDICINE': 'bg-red-100 text-red-800',
  'ADD_SALE': 'bg-emerald-100 text-emerald-800',
  'ADD_PURCHASE': 'bg-orange-100 text-orange-800',
  'ADD_CUSTOMER': 'bg-purple-100 text-purple-800',
  'UPDATE_CUSTOMER': 'bg-indigo-100 text-indigo-800',
  'DELETE_CUSTOMER': 'bg-rose-100 text-rose-800',
  'ADD_SUPPLIER': 'bg-teal-100 text-teal-800',
  'UPDATE_SUPPLIER': 'bg-cyan-100 text-cyan-800',
  'DELETE_SUPPLIER': 'bg-pink-100 text-pink-800',
  'LOGIN': 'bg-gray-100 text-gray-800',
  'EXPORT_DATA': 'bg-yellow-100 text-yellow-800',
  'IMPORT_DATA': 'bg-orange-100 text-orange-800',
};

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getAuditLogs().then(setLogs).catch(console.error);
  }, []);

  const filteredLogs = logs.filter(log => 
    log.username.toLowerCase().includes(search.toLowerCase()) ||
    (ACTION_MAP[log.action] || log.action).toLowerCase().includes(search.toLowerCase()) ||
    log.details.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <ClipboardList className="w-6 h-6 text-blue-600" />
          سجل النشاطات
        </h1>
      </div>

      <div className="bg-white p-3 rounded shadow-sm border border-gray-200 flex items-center gap-3">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="ابحث بالمستخدم، الإجراء، أو التفاصيل..."
          className="flex-1 outline-none text-gray-700"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-[#2E7D32] text-white">
            <tr>
              <th className="p-3 font-medium">التاريخ والوقت</th>
              <th className="p-3 font-medium">المستخدم</th>
              <th className="p-3 font-medium">الإجراء</th>
              <th className="p-3 font-medium">التفاصيل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="p-3 text-gray-700 whitespace-nowrap">
                  {format(new Date(log.timestamp), 'PPp', { locale: ar })}
                </td>
                <td className="p-3 font-bold text-gray-900">{log.username}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800'}`}>
                    {ACTION_MAP[log.action] || log.action}
                  </span>
                </td>
                <td className="p-3 text-gray-600 max-w-md truncate" title={log.details}>
                  {log.details}
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  لا توجد نشاطات مطابقة للبحث
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
