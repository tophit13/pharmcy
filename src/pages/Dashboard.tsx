import { useState, useEffect } from 'react';
import { api, Medicine, Sale, Store, Branch, Transfer } from '@/lib/api';
import { Package, AlertTriangle, Clock, TrendingUp, DollarSign, BarChart3, Eye, Truck } from 'lucide-react';
import { startOfDay, endOfDay } from 'date-fns';
import { useBranch } from '@/contexts/BranchContext';

interface TopSellingItem {
  medicineId: number;
  name: string;
  totalQuantity: number;
  totalRevenue: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [allMedicines, setAllMedicines] = useState<Medicine[]>([]);
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const { selectedBranch } = useBranch();

  useEffect(() => {
    const fetchData = async () => {
      const [medicines, sales, storesData, branchesData, transfersData] = await Promise.all([
        api.getMedicines(),
        api.getSales(),
        api.getStores(),
        api.getBranches(),
        api.getTransfers()
      ]);

      setAllMedicines(medicines);
      setAllSales(sales);
      setStores(storesData);
      setBranches(branchesData);
      setTransfers(transfersData);
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (allMedicines.length === 0 || allSales.length === 0) return;

    const fetchStats = async () => {
      const today = new Date();
      const start = startOfDay(today).getTime();
      const end = endOfDay(today).getTime();

      let filteredMedicines = allMedicines;
      let filteredSales = allSales;

      if (selectedBranch) {
        // Filter medicines by stores in the selected branch
        const branchStores = stores.filter(s => s.branchId === selectedBranch.id);
        const storeIds = branchStores.map(s => s.id);
        filteredMedicines = allMedicines.filter(m => storeIds.includes(m.storeId || 0));
        filteredSales = allSales.filter(s => storeIds.includes(s.storeId || 0));
      }

      // Today's sales
      const todaySales = filteredSales.filter(sale => {
        const saleTime = new Date(sale.date).getTime();
        return saleTime >= start && saleTime <= end;
      });

      const totalSales = todaySales.reduce((sum, sale) => sum + (sale.netTotal || 0), 0);
      const salesCount = todaySales.length;

      // Low stock alerts (all branches if no selection, else selected branch)
      const lowStockMedicines = selectedBranch ? filteredMedicines : allMedicines;
      const lowStock = lowStockMedicines.filter(m => m.quantity <= (m.reorderLimit || 10));

      // Expiring soon (next 3 months)
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
      const expiringSoon = filteredMedicines.filter(m => new Date(m.expiryDate) <= threeMonthsFromNow);
      const expiringAll = allMedicines.filter(m => new Date(m.expiryDate) <= threeMonthsFromNow);

      // Total inventory value
      const totalInventoryValue = filteredMedicines.reduce((sum, med) => sum + (med.quantity * med.purchasePrice), 0);

      // Top selling items today
      const itemSales: { [key: number]: TopSellingItem } = {};
      todaySales.forEach(sale => {
        sale.items.forEach(item => {
          if (!itemSales[item.medicineId]) {
            itemSales[item.medicineId] = {
              medicineId: item.medicineId,
              name: item.name,
              totalQuantity: 0,
              totalRevenue: 0
            };
          }
          itemSales[item.medicineId].totalQuantity += item.quantity;
          itemSales[item.medicineId].totalRevenue += item.total;
        });
      });

      const topSelling = Object.values(itemSales)
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 5);

      // Transfer statistics
      const pendingTransfers = transfers.filter(t => t.status === 'pending' || t.status === 'sent');
      const transferableShortages = allMedicines.filter(m => {
        const availableInOtherStores = allMedicines.filter(other =>
          other.barcode === m.barcode && other.storeId !== m.storeId && other.quantity > 0
        );
        return m.quantity <= (m.reorderLimit || 10) && availableInOtherStores.length > 0;
      });

      setStats({
        totalSales,
        salesCount,
        lowStockCount: lowStock.length,
        expiringCount: expiringSoon.length,
        expiringAllCount: expiringAll.length,
        totalInventoryValue,
        lowStock,
        expiringSoon,
        expiringAll,
        topSelling,
        pendingTransfersCount: pendingTransfers.length,
        transferableShortagesCount: transferableShortages.length,
        lowStockAll: allMedicines.filter(m => m.quantity <= (m.reorderLimit || 10))
      });
    };

    fetchStats();
  }, [selectedBranch, allMedicines, allSales, stores]);

  const getStoreName = (storeId?: number) => {
    const store = stores.find(s => s.id === storeId);
    return store ? store.name : 'غير محدد';
  };

  const getBranchName = (storeId?: number) => {
    const store = stores.find(s => s.id === storeId);
    if (!store) return 'غير محدد';
    const branch = branches.find(b => b.id === store.branchId);
    return branch ? branch.name : 'غير محدد';
  };

  if (!stats) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">جاري تحميل البيانات...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            لوحة التحكم - نظرة عامة
          </h1>
          <p className="text-gray-600 mt-2">مراقبة الأداء والتنبيهات في الوقت الفعلي</p>
        </div>

        {/* Stats Cards - 8 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Expiring Soon */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">قرب انتهاء الصلاحية</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.expiringCount}</p>
                <p className="text-xs text-gray-400 mt-1">في الفرع الحالي</p>
              </div>
              <div className="p-4 bg-red-100 rounded-full">
                <Clock className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600">إجمالي في كل الفروع: <span className="font-bold text-red-600">{stats.expiringAllCount}</span></p>
            </div>
          </div>

          {/* Card 2: Low Stock */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">نواقص المخزون</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{stats.lowStockCount}</p>
                <p className="text-xs text-gray-400 mt-1">تحتاج إعادة طلب</p>
              </div>
              <div className="p-4 bg-orange-100 rounded-full">
                <AlertTriangle className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Card 3: Today's Invoices */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">فواتير اليوم</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.salesCount}</p>
                <p className="text-xs text-gray-400 mt-1">عدد المبيعات</p>
              </div>
              <div className="p-4 bg-blue-100 rounded-full">
                <Package className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Card 4: Today's Sales */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">مبيعات اليوم</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.totalSales.toFixed(2)}</p>
                <p className="text-xs text-gray-400 mt-1">بالجنيه المصري</p>
              </div>
              <div className="p-4 bg-green-100 rounded-full">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          {/* Card 5: Total Inventory Value */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">قيمة المخزون</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{stats.totalInventoryValue.toFixed(2)}</p>
                <p className="text-xs text-gray-400 mt-1">بالجنيه المصري</p>
              </div>
              <div className="p-4 bg-purple-100 rounded-full">
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Card 6: Top Selling Items */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">الأكثر مبيعاً</p>
                <p className="text-3xl font-bold text-indigo-600 mt-1">{stats.topSelling.length}</p>
                <p className="text-xs text-gray-400 mt-1">أصناف اليوم</p>
              </div>
              <div className="p-4 bg-indigo-100 rounded-full">
                <BarChart3 className="w-8 h-8 text-indigo-600" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {stats.topSelling.slice(0, 3).map((item: TopSellingItem, index: number) => (
                <div key={item.medicineId} className="flex justify-between text-xs">
                  <span className="truncate">{item.name}</span>
                  <span className="font-bold text-indigo-600">{item.totalQuantity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 7: Pending Transfers */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">طلبات نقل معلقة</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{stats.pendingTransfersCount}</p>
                <p className="text-xs text-gray-400 mt-1">في انتظار الموافقة</p>
              </div>
              <div className="p-4 bg-purple-100 rounded-full">
                <Truck className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Card 8: Transferable Shortages */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">نواقص قابلة للنقل</p>
                <p className="text-3xl font-bold text-teal-600 mt-1">{stats.transferableShortagesCount}</p>
                <p className="text-xs text-gray-400 mt-1">يمكن حلها بالنقل</p>
              </div>
              <div className="p-4 bg-teal-100 rounded-full">
                <Package className="w-8 h-8 text-teal-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expiring Medicines Table */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-red-50">
              <h2 className="text-xl font-bold text-red-800 flex items-center gap-3">
                <Clock className="w-6 h-6" />
                أدوية تقترب من انتهاء الصلاحية
              </h2>
            </div>
            <div className="overflow-x-auto">
              {stats.expiringSoon.length === 0 ? (
                <p className="p-8 text-gray-500 text-center">لا توجد أدوية تقترب من انتهاء الصلاحية</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-4 text-right font-medium text-gray-700">اسم الدواء</th>
                      <th className="p-4 text-right font-medium text-gray-700">تاريخ الانتهاء</th>
                      <th className="p-4 text-right font-medium text-gray-700">الكمية</th>
                      <th className="p-4 text-right font-medium text-gray-700">المخزن</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stats.expiringSoon.slice(0, 10).map((med: Medicine) => (
                      <tr key={med.id} className="hover:bg-gray-50">
                        <td className="p-4 font-medium text-gray-900">{med.name}</td>
                        <td className="p-4 text-red-600 font-bold">{med.expiryDate}</td>
                        <td className="p-4 text-gray-700">{med.quantity}</td>
                        <td className="p-4 text-gray-700">{getStoreName(med.storeId)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Low Stock Alerts Table */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-orange-50">
              <h2 className="text-xl font-bold text-orange-800 flex items-center gap-3">
                <AlertTriangle className="w-6 h-6" />
                تنبيهات النواقص في كل الفروع
              </h2>
            </div>
            <div className="overflow-x-auto">
              {stats.lowStockAll.length === 0 ? (
                <p className="p-8 text-gray-500 text-center">لا توجد نواقص في المخزون</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-4 text-right font-medium text-gray-700">الفرع</th>
                      <th className="p-4 text-right font-medium text-gray-700">اسم الدواء</th>
                      <th className="p-4 text-right font-medium text-gray-700">الكمية الحالية</th>
                      <th className="p-4 text-right font-medium text-gray-700">الحد الأدنى</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stats.lowStockAll.slice(0, 10).map((med: Medicine) => (
                      <tr key={med.id} className="hover:bg-gray-50">
                        <td className="p-4 text-gray-700">{getBranchName(med.storeId)}</td>
                        <td className="p-4 font-medium text-gray-900">{med.name}</td>
                        <td className="p-4 text-orange-600 font-bold">{med.quantity}</td>
                        <td className="p-4 text-gray-700">{med.reorderLimit || 10}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
