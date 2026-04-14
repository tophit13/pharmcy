import React, { useState, useEffect } from 'react';
import { api, Store, Branch, Medicine } from '@/lib/api';
import { Building2, Plus, Edit, Trash2, Save, X, Eye, AlertTriangle } from 'lucide-react';

export default function Stores() {
  const [stores, setStores] = useState<Store[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [selectedStoreLowStock, setSelectedStoreLowStock] = useState<Medicine[]>([]);
  const [allLowStock, setAllLowStock] = useState<Medicine[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    branchId: 0, // 0 means central store
    type: 'branch' // 'branch' or 'central'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [storesData, branchesData, medicinesData] = await Promise.all([
        api.getStores(),
        api.getBranches(),
        api.getMedicines()
      ]);
      setStores(storesData);
      setBranches(branchesData);
      setMedicines(medicinesData);
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  const handleOpenModal = (store?: Store) => {
    if (store) {
      setEditingStore(store);
      setFormData({
        name: store.name,
        branchId: store.branchId || 0,
        type: store.branchId ? 'branch' : 'central'
      });
    } else {
      setEditingStore(null);
      setFormData({
        name: '',
        branchId: 0,
        type: 'branch'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStore(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        name: formData.name,
        branchId: formData.type === 'central' ? null : formData.branchId
      };

      if (editingStore) {
        await api.updateStore(editingStore.id, submitData);
        alert('تم تحديث بيانات المخزن بنجاح');
      } else {
        await api.addStore(submitData);
        alert('تمت إضافة المخزن بنجاح');
      }
      fetchData();
      handleCloseModal();
    } catch (error: any) {
      console.error('Failed to save store', error);
      alert('حدث خطأ أثناء حفظ بيانات المخزن');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المخزن؟')) {
      try {
        await api.deleteStore(id);
        alert('تم حذف المخزن بنجاح');
        fetchData();
      } catch (error) {
        console.error('Failed to delete store', error);
        alert('حدث خطأ أثناء حذف المخزن');
      }
    }
  };

  const getBranchName = (branchId: number | null) => {
    if (!branchId) return 'مخزن مركزي';
    const branch = branches.find(b => b.id === branchId);
    return branch ? branch.name : 'غير محدد';
  };

  const getStoreType = (store: Store) => {
    return store.branchId ? 'مخزن فرع' : 'مخزن مركزي';
  };

  const handleShowLowStock = (storeId: number) => {
    const storeMedicines = medicines.filter(m => m.storeId === storeId);
    const lowStock = storeMedicines.filter(m => m.quantity <= (m.reorderLimit || 10));
    setSelectedStoreLowStock(lowStock);
    setShowLowStockModal(true);
  };

  const handleShowAllLowStock = () => {
    const lowStock = medicines.filter(m => m.quantity <= (m.reorderLimit || 10));
    setAllLowStock(lowStock);
    setShowLowStockModal(true);
  };

  const getStoreName = (storeId: number) => {
    const store = stores.find(s => s.id === storeId);
    return store ? store.name : 'غير محدد';
  };

  const getBranchNameForMedicine = (storeId: number) => {
    const store = stores.find(s => s.id === storeId);
    if (!store) return 'غير محدد';
    return getBranchName(store.branchId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            المخازن الداخلية
          </h1>
          <div className="flex gap-3">
            <button
              onClick={handleShowAllLowStock}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              <AlertTriangle className="w-5 h-5" />
              عرض نواقص كل الفروع
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-[#2E7D32] text-white rounded-lg hover:bg-green-800 transition-colors"
            >
              <Plus className="w-5 h-5" />
              إضافة مخزن
            </button>
          </div>
        </div>

        {/* Stores Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-[#2E7D32] text-white">
              <tr>
                <th className="p-4 font-medium">كود المخزن</th>
                <th className="p-4 font-medium">اسم المخزن</th>
                <th className="p-4 font-medium">نوع المخزن</th>
                <th className="p-4 font-medium">الفرع التابع له</th>
                <th className="p-4 font-medium text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stores.map((store) => (
                <tr key={store.id} className="hover:bg-gray-50">
                  <td className="p-4 text-gray-700">{store.id}</td>
                  <td className="p-4 font-bold text-gray-900">{store.name}</td>
                  <td className="p-4 text-gray-700">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      store.branchId ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {getStoreType(store)}
                    </span>
                  </td>
                  <td className="p-4 text-gray-700">{getBranchName(store.branchId)}</td>
                  <td className="p-4 flex justify-center gap-2">
                    <button
                      onClick={() => handleShowLowStock(store.id)}
                      className="p-1.5 text-orange-600 hover:bg-orange-50 rounded"
                      title="عرض النواقص"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenModal(store)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                      title="تعديل"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(store.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                      title="حذف"
                      disabled={store.id === 1} // Prevent deleting main store
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {stores.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    لا توجد مخازن
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-bold text-gray-800">
                  {editingStore ? 'تعديل مخزن' : 'إضافة مخزن جديد'}
                </h2>
                <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم المخزن</label>
                  <input
                    type="text"
                    required
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نوع المخزن</label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="branch">مخزن فرع</option>
                    <option value="central">مخزن مركزي</option>
                  </select>
                </div>

                {formData.type === 'branch' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الفرع التابع له</label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      value={formData.branchId}
                      onChange={(e) => setFormData({...formData, branchId: parseInt(e.target.value)})}
                      required
                    >
                      <option value="">اختر الفرع</option>
                      {branches.map(branch => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    {editingStore ? 'تحديث' : 'إضافة'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Low Stock Modal */}
        {showLowStockModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-orange-50">
                <h2 className="text-lg font-bold text-orange-800 flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6" />
                  {selectedStoreLowStock.length > 0 ? 'نواقص المخزن' : 'نواقص كل الفروع'}
                </h2>
                <button onClick={() => setShowLowStockModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-x-auto max-h-[60vh]">
                {selectedStoreLowStock.length > 0 || allLowStock.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="p-4 text-right font-medium text-gray-700">الفرع</th>
                        <th className="p-4 text-right font-medium text-gray-700">المخزن</th>
                        <th className="p-4 text-right font-medium text-gray-700">اسم الدواء</th>
                        <th className="p-4 text-right font-medium text-gray-700">الكمية الحالية</th>
                        <th className="p-4 text-right font-medium text-gray-700">الحد الأدنى</th>
                        <th className="p-4 text-right font-medium text-gray-700">الشركة المصنعة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(selectedStoreLowStock.length > 0 ? selectedStoreLowStock : allLowStock).map((med) => (
                        <tr key={med.id} className="hover:bg-gray-50">
                          <td className="p-4 text-gray-700">{getBranchNameForMedicine(med.storeId || 0)}</td>
                          <td className="p-4 text-gray-700">{getStoreName(med.storeId || 0)}</td>
                          <td className="p-4 font-medium text-gray-900">{med.name}</td>
                          <td className="p-4 text-orange-600 font-bold">{med.quantity}</td>
                          <td className="p-4 text-gray-700">{med.reorderLimit || 10}</td>
                          <td className="p-4 text-gray-700">{med.manufacturer}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="p-8 text-gray-500 text-center">لا توجد نواقص في المخزون</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/*
تعليمات إضافة مخزن جديد أو ربط مخزن بفرع:

1. **إضافة مخزن مركزي:**
   - اختر "مخزن مركزي" من نوع المخزن
   - لا تحتاج لاختيار فرع
   - المخزن المركزي يكون مشتركاً بين جميع الفروع

2. **إضافة مخزن فرع:**
   - اختر "مخزن فرع" من نوع المخزن
   - اختر الفرع الذي يتبع له المخزن من القائمة
   - كل فرع يمكن أن يكون له مخزن واحد فقط

3. **ربط الأصناف بالمخازن:**
   - عند إضافة صنف جديد، اختر المخزن المناسب من قائمة المخازن
   - الأصناف تُدار حسب المخزن المختار
   - المبيعات والمشتريات تؤثر على مخزن معين

4. **الصلاحيات:**
   - المدير (Admin): يدير جميع المخازن والفروع
   - الصيدلي/الكاشير: يشاهد نواقص جميع الفروع لكن يعدل مخزنه فقط

5. **ملاحظات:**
   - لا يمكن حذف المخزن الرئيسي (ID = 1)
   - تأكد من ربط كل فرع بمخزن واحد على الأقل
*/
