import React, { useState, useEffect } from 'react';
import { api, Medicine } from '@/lib/api';
import { PackagePlus, Save, X, Barcode as BarcodeIcon } from 'lucide-react';

export default function AddItem() {
  const [formData, setFormData] = useState<Partial<Medicine>>({
    code: '',
    barcode: '',
    name: '',
    unit: 'علبة',
    purchasePrice: 0,
    salePrice: 0,
    quantity: 0,
    reorderLimit: 5,
    expiryDate: '',
    manufacturer: '',
    storeId: 1
  });

  const [stores, setStores] = useState<any[]>([]);

  useEffect(() => {
    fetchStores();
    generateCode();
  }, []);

  const fetchStores = async () => {
    try {
      const data = await api.getStores();
      setStores(data);
      if (data.length > 0) {
        setFormData(prev => ({ ...prev, storeId: data[0].id }));
      }
    } catch (error) {
      console.error('Failed to fetch stores', error);
    }
  };

  const generateCode = async () => {
    try {
      const medicines = await api.getMedicines();
      const maxId = medicines.reduce((max, med) => Math.max(max, med.id || 0), 0);
      const newCode = `MED${String(maxId + 1).padStart(4, '0')}`;
      setFormData(prev => ({ ...prev, code: newCode }));
    } catch (error) {
      console.error('Failed to generate code', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addMedicine(formData as Medicine);
      alert('تمت إضافة الصنف بنجاح');
      
      // Reset form
      setFormData({
        code: '',
        barcode: '',
        name: '',
        unit: 'علبة',
        purchasePrice: 0,
        salePrice: 0,
        quantity: 0,
        reorderLimit: 5,
        expiryDate: '',
        manufacturer: '',
        storeId: stores.length > 0 ? stores[0].id : 1
      });
      generateCode(); // Generate new code for next item
    } catch (error) {
      console.error('Failed to add medicine', error);
      alert('حدث خطأ أثناء إضافة الصنف');
    }
  };

  const handleClear = () => {
    setFormData({
      code: formData.code, // Keep the generated code
      barcode: '',
      name: '',
      unit: 'علبة',
      purchasePrice: 0,
      salePrice: 0,
      quantity: 0,
      reorderLimit: 5,
      expiryDate: '',
      manufacturer: '',
      storeId: stores.length > 0 ? stores[0].id : 1
    });
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <PackagePlus className="w-6 h-6 text-blue-600" />
          إضافة صنف جديد
        </h1>
      </div>

      <div className="bg-white p-6 rounded shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-700 border-b pb-2">البيانات الأساسية</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">كود الصنف (تلقائي)</label>
                <input
                  type="text"
                  readOnly
                  className="w-full p-2 border border-gray-300 rounded bg-gray-50 text-gray-500 outline-none"
                  value={formData.code}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الباركود</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.barcode}
                    onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                    placeholder="امسح الباركود..."
                  />
                  <button type="button" className="p-2 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200">
                    <BarcodeIcon className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الصنف</label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الشركة المنتجة</label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({...formData, manufacturer: e.target.value})}
                />
              </div>
            </div>

            {/* Pricing & Quantity */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-700 border-b pb-2">الأسعار والكميات</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوحدة</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.unit}
                  onChange={(e) => setFormData({...formData, unit: e.target.value})}
                >
                  <option value="علبة">علبة</option>
                  <option value="شريط">شريط</option>
                  <option value="زجاجة">زجاجة</option>
                  <option value="امبول">امبول</option>
                  <option value="قطرة">قطرة</option>
                  <option value="كيس">كيس</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">سعر الشراء</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.purchasePrice || ''}
                    onChange={(e) => setFormData({...formData, purchasePrice: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">سعر البيع</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.salePrice || ''}
                    onChange={(e) => setFormData({...formData, salePrice: parseFloat(e.target.value)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الكمية الافتتاحية</label>
                  <input
                    type="number"
                    min="0"
                    required
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.quantity || ''}
                    onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">حد الطلب (النواقص)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.reorderLimit || ''}
                    onChange={(e) => setFormData({...formData, reorderLimit: parseInt(e.target.value)})}
                  />
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-700 border-b pb-2">بيانات إضافية</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الصلاحية</label>
                <input
                  type="date"
                  required
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المخزن</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.storeId}
                  onChange={(e) => setFormData({...formData, storeId: parseInt(e.target.value)})}
                  required
                >
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-2 px-6 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
              تفريغ الحقول
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2 bg-[#2E7D32] text-white rounded hover:bg-green-800 transition-colors"
            >
              <Save className="w-5 h-5" />
              حفظ الصنف
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
