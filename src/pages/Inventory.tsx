import React, { useState, useEffect } from 'react';
import { api, Medicine } from '@/lib/api';
import { Plus, Search, Edit, Trash2, AlertTriangle, X } from 'lucide-react';
import { useBranch } from '@/contexts/BranchContext';

export default function Inventory() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medicine | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [filteredMedicines, setFilteredMedicines] = useState<Medicine[]>([]);
  const { selectedBranch, branches } = useBranch();

  const loadMedicines = async () => {
    const data = await api.getMedicines();
    setMedicines(data);
  };

  useEffect(() => {
    loadMedicines();
  }, []);

  useEffect(() => {
    let result = medicines;
    
    if (selectedBranch) {
      result = result.filter(m => m.branchId === selectedBranch.id);
    }

    if (search) {
      result = result.filter(m => 
        m.name.toLowerCase().includes(search.toLowerCase()) || 
        m.barcode.includes(search) ||
        (m.code && m.code.includes(search))
      );
    }
    
    setFilteredMedicines(result);
  }, [search, medicines, selectedBranch]);

  const handleDelete = async (id: number) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الدواء؟')) {
      await api.deleteMedicine(id);
      loadMedicines();
    }
  };

  const openEditModal = (med: Medicine) => {
    setEditingMed(med);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingMed(null);
    setIsModalOpen(true);
  };

  const getBranchName = (branchId?: number) => {
    if (!branchId) return '-';
    return branches.find(b => b.id === branchId)?.name || 'غير معروف';
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">قائمة الأصناف {selectedBranch ? `(${selectedBranch.name})` : ''}</h1>
        <button
          onClick={openAddModal}
          className="bg-[#2E7D32] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          إضافة صنف جديد
        </button>
      </div>

      <div className="bg-white p-3 rounded shadow-sm border border-gray-200 flex items-center gap-3">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="ابحث بالاسم، الباركود، أو كود الصنف..."
          className="flex-1 outline-none text-gray-700"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-[#2E7D32] text-white">
            <tr>
              <th className="p-3 font-medium">كود الصنف</th>
              <th className="p-3 font-medium">الباركود</th>
              <th className="p-3 font-medium">اسم الصنف</th>
              <th className="p-3 font-medium">الفرع</th>
              <th className="p-3 font-medium">الوحدة</th>
              <th className="p-3 font-medium">سعر الشراء</th>
              <th className="p-3 font-medium">سعر البيع</th>
              <th className="p-3 font-medium">الكمية</th>
              <th className="p-3 font-medium">حد الطلب</th>
              <th className="p-3 font-medium">تاريخ الصلاحية</th>
              <th className="p-3 font-medium">الشركة</th>
              <th className="p-3 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredMedicines.map((med) => {
              const isLowStock = med.quantity <= (med.reorderLimit || 10);
              const isExpiringSoon = new Date(med.expiryDate).getTime() - new Date().getTime() < 90 * 24 * 60 * 60 * 1000;

              return (
                <tr key={med.id} className="hover:bg-gray-50">
                  <td className="p-3 text-gray-700">{med.code || '-'}</td>
                  <td className="p-3 text-gray-700">{med.barcode}</td>
                  <td className="p-3 font-bold text-gray-900">
                    <div className="flex items-center gap-2">
                      {med.name}
                      {(isLowStock || isExpiringSoon) && (
                        <AlertTriangle className={`w-4 h-4 ${isExpiringSoon ? 'text-red-500' : 'text-yellow-500'}`} />
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-gray-700">{getBranchName(med.branchId)}</td>
                  <td className="p-3 text-gray-700">{med.unit || '-'}</td>
                  <td className="p-3 text-gray-700">{med.purchasePrice.toFixed(2)}</td>
                  <td className="p-3 font-bold text-green-700">{med.salePrice.toFixed(2)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${isLowStock ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                      {med.quantity}
                    </span>
                  </td>
                  <td className="p-3 text-gray-700">{med.reorderLimit || 10}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${isExpiringSoon ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                      {med.expiryDate}
                    </span>
                  </td>
                  <td className="p-3 text-gray-700">{med.manufacturer}</td>
                  <td className="p-3 flex items-center gap-2">
                    <button onClick={() => openEditModal(med)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => med.id && handleDelete(med.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredMedicines.length === 0 && (
              <tr>
                <td colSpan={11} className="p-8 text-center text-gray-500">
                  لا توجد أصناف مطابقة للبحث
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <MedicineModal 
          med={editingMed} 
          onClose={() => setIsModalOpen(false)} 
          onSave={loadMedicines}
        />
      )}
    </div>
  );
}

function MedicineModal({ med, onClose, onSave }: { med: Medicine | null, onClose: () => void, onSave: () => void }) {
  const [formData, setFormData] = useState<Partial<Medicine>>(
    med || {
      code: '',
      barcode: '',
      name: '',
      unit: 'علبة',
      purchasePrice: 0,
      salePrice: 0,
      quantity: 0,
      reorderLimit: 10,
      expiryDate: new Date().toISOString().split('T')[0],
      manufacturer: ''
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (med?.id) {
      await api.updateMedicine(med.id, formData as Medicine);
    } else {
      await api.addMedicine(formData as Medicine);
    }
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900">
            {med ? 'تعديل بيانات الصنف' : 'إضافة صنف جديد'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">كود الصنف</label>
              <input
                type="text"
                value={formData.code || ''}
                onChange={e => setFormData({...formData, code: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الباركود</label>
              <input
                type="text"
                required
                value={formData.barcode}
                onChange={e => setFormData({...formData, barcode: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم الصنف</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الوحدة</label>
              <input
                type="text"
                value={formData.unit || ''}
                onChange={e => setFormData({...formData, unit: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الشركة المصنعة</label>
              <input
                type="text"
                required
                value={formData.manufacturer}
                onChange={e => setFormData({...formData, manufacturer: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">سعر الشراء</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.purchasePrice}
                onChange={e => setFormData({...formData, purchasePrice: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">سعر البيع</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.salePrice}
                onChange={e => setFormData({...formData, salePrice: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الكمية الحالية</label>
              <input
                type="number"
                required
                value={formData.quantity}
                onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">حد الطلب (النواقص)</label>
              <input
                type="number"
                value={formData.reorderLimit || 10}
                onChange={e => setFormData({...formData, reorderLimit: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الصلاحية</label>
              <input
                type="date"
                required
                value={formData.expiryDate}
                onChange={e => setFormData({...formData, expiryDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] outline-none"
              />
            </div>
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-200 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-[#2E7D32] hover:bg-green-800 rounded transition-colors"
            >
              حفظ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
