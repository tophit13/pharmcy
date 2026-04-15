import React, { useState, useEffect } from 'react';
import { api, Medicine, Branch } from '@/lib/api';
import { AlertTriangle, PackageX, CalendarClock, Building2, Printer } from 'lucide-react';

export default function GlobalAlerts() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Medicine[]>([]);
  const [expiringItems, setExpiringItems] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'lowStock' | 'expiring'>('lowStock');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [branchesData, lowStock, expiring] = await Promise.all([
        api.getBranches(),
        api.getLowStockProducts(), // No branchId = all branches
        api.getExpiringProducts(30) // No branchId = all branches
      ]);
      setBranches(branchesData);
      setLowStockItems(lowStock);
      setExpiringItems(expiring);
    } catch (error) {
      console.error('Failed to load global alerts data', error);
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

  const getBranchName = (branchId: number) => {
    return branches.find(b => b.id === branchId)?.name || 'فرع غير معروف';
  };

  // Group items by branch
  const groupedLowStock = lowStockItems.reduce((acc, item) => {
    const branchId = item.branchId || 0;
    if (!acc[branchId]) acc[branchId] = [];
    acc[branchId].push(item);
    return acc;
  }, {} as Record<number, Medicine[]>);

  const groupedExpiring = expiringItems.reduce((acc, item) => {
    const branchId = item.branchId || 0;
    if (!acc[branchId]) acc[branchId] = [];
    acc[branchId].push(item);
    return acc;
  }, {} as Record<number, Medicine[]>);

  const handlePrint = () => {
    const printContent = document.getElementById('printable-area');
    if (!printContent) return;

    const originalContents = document.body.innerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>تقرير ${activeTab === 'lowStock' ? 'نواقص المخزون' : 'تواريخ الصلاحية'}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; direction: rtl; }
            h1 { text-align: center; color: #333; }
            .branch-section { margin-bottom: 30px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
            .branch-header { background-color: #f3f4f6; padding: 10px 15px; font-weight: bold; border-bottom: 1px solid #ddd; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 10px; text-align: right; border-bottom: 1px solid #eee; }
            th { background-color: #f9fafb; color: #555; }
            .text-red { color: #dc2626; }
            .text-orange { color: #ea580c; }
            .line-through { text-decoration: line-through; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>تقرير ${activeTab === 'lowStock' ? 'نواقص المخزون الشاملة' : 'تواريخ الصلاحية الشاملة'}</h1>
          <p style="text-align: center; color: #666;">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</p>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="flex justify-between items-center bg-white p-4 rounded shadow-sm border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="bg-red-100 p-2 rounded-lg text-red-700">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">تنبيهات المخزون الشاملة</h1>
            <p className="text-sm text-gray-500">متابعة النواقص وتواريخ الصلاحية لجميع الفروع</p>
          </div>
        </div>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
        >
          <Printer className="w-5 h-5" />
          طباعة التقرير
        </button>
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
      <div id="printable-area" className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">جاري تحميل البيانات...</p>
          </div>
        ) : activeTab === 'lowStock' ? (
          <div className="p-4 space-y-6">
            {Object.keys(groupedLowStock).length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                لا توجد أصناف ناقصة في أي فرع.
              </div>
            ) : (
              Object.entries(groupedLowStock).map(([branchIdStr, items]) => {
                const branchId = parseInt(branchIdStr);
                return (
                  <div key={branchId} className="branch-section border border-gray-200 rounded-lg overflow-hidden">
                    <div className="branch-header bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-gray-600" />
                      <h3 className="font-bold text-gray-800 text-lg">{getBranchName(branchId)}</h3>
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">{items.length} أصناف</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                          <tr>
                            <th className="p-3 font-bold">كود الصنف</th>
                            <th className="p-3 font-bold">اسم الصنف</th>
                            <th className="p-3 font-bold text-center">الكمية الحالية</th>
                            <th className="p-3 font-bold text-center">حد الطلب</th>
                            <th className="p-3 font-bold text-center">الفرق</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {items.map((item) => (
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
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {Object.keys(groupedExpiring).length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                لا توجد أصناف قريبة الانتهاء في أي فرع.
              </div>
            ) : (
              Object.entries(groupedExpiring).map(([branchIdStr, items]) => {
                const branchId = parseInt(branchIdStr);
                return (
                  <div key={branchId} className="branch-section border border-gray-200 rounded-lg overflow-hidden">
                    <div className="branch-header bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-gray-600" />
                      <h3 className="font-bold text-gray-800 text-lg">{getBranchName(branchId)}</h3>
                      <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">{items.length} أصناف</span>
                    </div>
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
                          {items.map((item) => {
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
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
