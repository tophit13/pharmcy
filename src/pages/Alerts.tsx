import React, { useState, useEffect } from 'react';
import { api, Medicine } from '@/lib/api';
import { useBranch } from '@/contexts/BranchContext';
import { AlertTriangle, PackageX, CalendarClock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LowStock() {
  const { selectedBranch } = useBranch();
  const [lowStockItems, setLowStockItems] = useState<Medicine[]>([]);
  const [expiringItems, setExpiringItems] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'lowStock' | 'expiring'>('lowStock');

  useEffect(() => {
    if (selectedBranch) {
      loadData();
    }
  }, [selectedBranch]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [lowStock, expiring] = await Promise.all([
        api.getLowStockProducts(selectedBranch?.id),
        api.getExpiringProducts(30, selectedBranch?.id)
      ]);
      setLowStockItems(lowStock);
      setExpiringItems(expiring);
    } catch (error) {
      console.error('Failed to load alerts data', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isExpired = (dateString: string) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  const getDaysUntilExpiry = (dateString: string) => {
    if (!dateString) return 999;
    const diffTime = Math.abs(new Date(dateString).getTime() - new Date().getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (!selectedBranch) {
    return (
      <div className="p-8 text-center bg-white rounded shadow-sm border border-gray-200 m-4">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800">الرجاء تحديد الفرع أولاً</h2>
        <p className="text-gray-600 mt-2">يجب تحديد الفرع من القائمة العلوية لعرض التنبيهات.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="flex justify-between items-center bg-white p-4 rounded shadow-sm border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="bg-red-100 p-2 rounded-lg text-red-700">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">تنبيهات المخزون</h1>
            <p className="text-sm text-gray-500">متابعة النواقص وتواريخ الصلاحية لفرع {selectedBranch.name}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('lowStock')}
          className={`pb-2 px-4 font-bold flex items-center gap-2 transition-colors ${
            activeTab === 'lowStock' 
              ? 'border-b-2 border-red-600 text-red-700' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <PackageX className="w-5 h-5" />
          نواقص المخزون
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
            activeTab === 'lowStock' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
          }`}>
            {lowStockItems.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('expiring')}
          className={`pb-2 px-4 font-bold flex items-center gap-2 transition-colors ${
            activeTab === 'expiring' 
              ? 'border-b-2 border-orange-500 text-orange-700' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <CalendarClock className="w-5 h-5" />
          تواريخ الصلاحية
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
            activeTab === 'expiring' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600'
          }`}>
            {expiringItems.length}
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">جاري تحميل البيانات...</p>
          </div>
        ) : activeTab === 'lowStock' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="p-3 font-bold">كود الصنف</th>
                  <th className="p-3 font-bold">اسم الصنف</th>
                  <th className="p-3 font-bold text-center">الكمية الحالية</th>
                  <th className="p-3 font-bold text-center">حد الطلب</th>
                  <th className="p-3 font-bold text-center">الفرق</th>
                  <th className="p-3 font-bold text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lowStockItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      لا توجد أصناف ناقصة في هذا الفرع.
                    </td>
                  </tr>
                ) : (
                  lowStockItems.map((item) => (
                    <tr key={item.id} className="hover:bg-red-50 transition-colors">
                      <td className="p-3 text-gray-600">{item.code}</td>
                      <td className="p-3 font-bold text-gray-800">{item.name}</td>
                      <td className="p-3 text-center">
                        <span className="inline-block px-2 py-1 bg-red-100 text-red-800 font-bold rounded">
                          {item.quantity} {item.unit}
                        </span>
                      </td>
                      <td className="p-3 text-center text-gray-600">{item.reorderLimit}</td>
                      <td className="p-3 text-center font-bold text-red-600">
                        {item.quantity - (item.reorderLimit || 0)}
                      </td>
                      <td className="p-3 text-center">
                        <Link 
                          to="/inventory/receive"
                          className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded text-xs font-bold transition-colors"
                        >
                          طلب كمية <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="p-3 font-bold">كود الصنف</th>
                  <th className="p-3 font-bold">اسم الصنف</th>
                  <th className="p-3 font-bold text-center">الكمية المتاحة</th>
                  <th className="p-3 font-bold text-center">تاريخ الصلاحية</th>
                  <th className="p-3 font-bold text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expiringItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      لا توجد أصناف قريبة الانتهاء خلال 30 يوماً.
                    </td>
                  </tr>
                ) : (
                  expiringItems.map((item) => {
                    const expired = isExpired(item.expiryDate);
                    const daysLeft = getDaysUntilExpiry(item.expiryDate);
                    const isUrgent = daysLeft <= 7;

                    return (
                      <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${expired ? 'bg-red-50' : isUrgent ? 'bg-orange-50' : ''}`}>
                        <td className={`p-3 text-gray-600 ${expired ? 'line-through' : ''}`}>{item.code}</td>
                        <td className={`p-3 font-bold text-gray-800 ${expired ? 'line-through text-red-700' : ''}`}>{item.name}</td>
                        <td className="p-3 text-center text-gray-700">{item.quantity} {item.unit}</td>
                        <td className="p-3 text-center font-bold text-gray-800" dir="ltr">{item.expiryDate}</td>
                        <td className="p-3 text-center">
                          {expired ? (
                            <span className="inline-block px-2 py-1 bg-red-600 text-white font-bold rounded text-xs">
                              منتهي الصلاحية
                            </span>
                          ) : isUrgent ? (
                            <span className="inline-block px-2 py-1 bg-red-100 text-red-800 font-bold rounded text-xs">
                              ينتهي خلال {daysLeft} أيام
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-1 bg-orange-100 text-orange-800 font-bold rounded text-xs">
                              ينتهي خلال {daysLeft} يوماً
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
