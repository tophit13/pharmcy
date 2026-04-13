import React, { useState, useEffect } from 'react';
import { api, Store, Branch } from '@/lib/api';
import { Building2, Plus, Edit, Trash2, Save, X } from 'lucide-react';

export default function Stores() {
  const [stores, setStores] = useState<Store[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    branchId: 1
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [storesData, branchesData] = await Promise.all([
        api.getStores(),
        api.getBranches()
      ]);
      setStores(storesData);
      setBranches(branchesData);
      if (branchesData.length > 0) {
        setFormData(prev => ({ ...prev, branchId: branchesData[0].id }));
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  const handleOpenModal = (store?: Store) => {
    if (store) {
      setEditingStore(store);
      setFormData({
        name: store.name,
        branchId: store.branchId
      });
    } else {
      setEditingStore(null);
      setFormData({
        name: '',
        branchId: branches.length > 0 ? branches[0].id : 1
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
      if (editingStore) {
        await api.updateStore(editingStore.id, formData);
        alert('تم تحديث بيانات المخزن بنجاح');
      } else {
        await api.addStore(formData);
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

  const getBranchName = (branchId: number) => {
    const branch = branches.find(b => b.id === branchId);
    return branch ? branch.name : 'غير محدد';
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <Building2 className="w-6 h-6 text-blue-600" />
          المخازن الداخلية
        </h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-[#2E7D32] text-white rounded hover:bg-green-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          إضافة مخزن
        </button>
      </div>

      <div className="bg-white rounded shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-[#2E7D32] text-white">
            <tr>
              <th className="p-3 font-medium">كود المخزن</th>
              <th className="p-3 font-medium">اسم المخزن</th>
              <th className="p-3 font-medium">الفرع التابع له</th>
              <th className="p-3 font-medium text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {stores.map((store) => (
              <tr key={store.id} className="hover:bg-gray-50">
                <td className="p-3 text-gray-700">{store.id}</td>
                <td className="p-3 font-bold text-gray-900">{store.name}</td>
                <td className="p-3 text-gray-700">{getBranchName(store.branchId)}</td>
                <td className="p-3 flex justify-center gap-2">
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
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  لا توجد مخازن
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">الفرع التابع له</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={formData.branchId}
                  onChange={(e) => setFormData({...formData, branchId: parseInt(e.target.value)})}
                  required
                >
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>

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
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
