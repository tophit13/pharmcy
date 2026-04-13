import React, { useState, useEffect } from 'react';
import { api, Medicine } from '@/lib/api';
import { Plus, Search, Edit, Trash2, X } from 'lucide-react';

export default function Inventory() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medicine | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [filteredMedicines, setFilteredMedicines] = useState<Medicine[]>([]);

  const loadMedicines = async () => {
    const data = await api.getMedicines();
    setMedicines(data);
  };

  useEffect(() => {
    loadMedicines();
  }, []);

  useEffect(() => {
    if (search) {
      setFilteredMedicines(
        medicines.filter(m => 
          m.name.toLowerCase().includes(search.toLowerCase()) || 
          m.barcode.includes(search)
        )
      );
    } else {
      setFilteredMedicines(medicines);
    }
  }, [search, medicines]);

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

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">إدارة المخزون</h1>
        <button
          onClick={openAddModal}
          className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          إضافة دواء جديد
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="ابحث بالاسم أو الباركود..."
          className="flex-1 outline-none text-gray-700"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-4 font-medium text-gray-600">الباركود</th>
              <th className="p-4 font-medium text-gray-600">اسم الدواء</th>
              <th className="p-4 font-medium text-gray-600">الكمية</th>
              <th className="p-4 font-medium text-gray-600">سعر الشراء</th>
              <th className="p-4 font-medium text-gray-600">سعر البيع</th>
              <th className="p-4 font-medium text-gray-600">تاريخ الصلاحية</th>
              <th className="p-4 font-medium text-gray-600">الشركة</th>
              <th className="p-4 font-medium text-gray-600">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredMedicines.map((med) => (
              <tr key={med.id} className="hover:bg-gray-50">
                <td className="p-4 text-gray-600">{med.barcode}</td>
                <td className="p-4 font-medium text-gray-900">{med.name}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-sm ${med.quantity <= 10 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                    {med.quantity}
                  </span>
                </td>
                <td className="p-4 text-gray-600">{med.purchasePrice} ج.م</td>
                <td className="p-4 font-medium text-green-600">{med.salePrice} ج.م</td>
                <td className="p-4 text-gray-600">{med.expiryDate}</td>
                <td className="p-4 text-gray-600">{med.manufacturer}</td>
                <td className="p-4 flex items-center gap-2">
                  <button onClick={() => openEditModal(med)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => med.id && handleDelete(med.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredMedicines.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-500">
                  لا توجد أدوية مطابقة للبحث
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
      barcode: '',
      name: '',
      purchasePrice: 0,
      salePrice: 0,
      quantity: 0,
      expiryDate: '',
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900">
            {med ? 'تعديل دواء' : 'إضافة دواء جديد'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الباركود</label>
              <input
                type="text"
                required
                value={formData.barcode}
                onChange={e => setFormData({...formData, barcode: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم الدواء</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الكمية</label>
              <input
                type="number"
                required
                value={formData.quantity}
                onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الصلاحية</label>
              <input
                type="date"
                required
                value={formData.expiryDate}
                onChange={e => setFormData({...formData, expiryDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">الشركة المصنعة</label>
              <input
                type="text"
                required
                value={formData.manufacturer}
                onChange={e => setFormData({...formData, manufacturer: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
            </div>
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              حفظ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
