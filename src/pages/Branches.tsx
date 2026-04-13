import React, { useState, useEffect } from 'react';
import { api, Branch } from '@/lib/api';
import { MapPin, Plus, Edit, Trash2, Save, X } from 'lucide-react';

export default function Branches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: ''
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const data = await api.getBranches();
      setBranches(data);
    } catch (error) {
      console.error('Failed to fetch branches', error);
    }
  };

  const handleOpenModal = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      setFormData({
        name: branch.name,
        address: branch.address,
        phone: branch.phone
      });
    } else {
      setEditingBranch(null);
      setFormData({
        name: '',
        address: '',
        phone: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBranch(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBranch) {
        await api.updateBranch(editingBranch.id, formData);
        alert('تم تحديث بيانات الفرع بنجاح');
      } else {
        await api.addBranch(formData);
        alert('تمت إضافة الفرع بنجاح');
      }
      fetchBranches();
      handleCloseModal();
    } catch (error: any) {
      console.error('Failed to save branch', error);
      alert('حدث خطأ أثناء حفظ بيانات الفرع');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الفرع؟')) {
      try {
        await api.deleteBranch(id);
        alert('تم حذف الفرع بنجاح');
        fetchBranches();
      } catch (error) {
        console.error('Failed to delete branch', error);
        alert('حدث خطأ أثناء حذف الفرع');
      }
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <MapPin className="w-6 h-6 text-blue-600" />
          فروع المؤسسة
        </h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-[#2E7D32] text-white rounded hover:bg-green-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          إضافة فرع
        </button>
      </div>

      <div className="bg-white rounded shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-[#2E7D32] text-white">
            <tr>
              <th className="p-3 font-medium">كود الفرع</th>
              <th className="p-3 font-medium">اسم الفرع</th>
              <th className="p-3 font-medium">العنوان</th>
              <th className="p-3 font-medium">التليفون</th>
              <th className="p-3 font-medium text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {branches.map((branch) => (
              <tr key={branch.id} className="hover:bg-gray-50">
                <td className="p-3 text-gray-700">{branch.id}</td>
                <td className="p-3 font-bold text-gray-900">{branch.name}</td>
                <td className="p-3 text-gray-700">{branch.address}</td>
                <td className="p-3 text-gray-700">{branch.phone}</td>
                <td className="p-3 flex justify-center gap-2">
                  <button
                    onClick={() => handleOpenModal(branch)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                    title="تعديل"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(branch.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    title="حذف"
                    disabled={branch.id === 1} // Prevent deleting main branch
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {branches.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  لا توجد فروع
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
                {editingBranch ? 'تعديل فرع' : 'إضافة فرع جديد'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الفرع</label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">التليفون</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
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
