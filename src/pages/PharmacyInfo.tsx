import React, { useState, useEffect } from 'react';
import { api, Settings } from '@/lib/api';
import { Building, Save } from 'lucide-react';

export default function PharmacyInfo() {
  const [formData, setFormData] = useState<Settings>({
    pharmacyName: '',
    address: '',
    phone: '',
    manager: '',
    license: ''
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await api.getSettings();
      setFormData(prev => ({ ...prev, ...data }));
    } catch (error) {
      console.error('Failed to fetch settings', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateSettings(formData);
      alert('تم حفظ بيانات الصيدلية بنجاح');
    } catch (error) {
      console.error('Failed to save settings', error);
      alert('حدث خطأ أثناء حفظ البيانات');
    }
  };

  if (isLoading) return <div className="p-8">جاري التحميل...</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <Building className="w-6 h-6 text-blue-600" />
          بيانات الصيدلية
        </h1>
      </div>

      <div className="bg-white p-6 rounded shadow-sm border border-gray-200 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم الصيدلية</label>
            <input
              type="text"
              required
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.pharmacyName || ''}
              onChange={(e) => setFormData({...formData, pharmacyName: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.address || ''}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">التليفون</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.phone || ''}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المدير المسئول</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.manager || ''}
              onChange={(e) => setFormData({...formData, manager: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رقم الرخصة</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.license || ''}
              onChange={(e) => setFormData({...formData, license: e.target.value})}
            />
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <Save className="w-5 h-5" />
              حفظ البيانات
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
