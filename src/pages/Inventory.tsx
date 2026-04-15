import React, { useState, useEffect, useRef } from 'react';
import { api, Medicine } from '@/lib/api';
import { Plus, Search, Edit, Trash2, AlertTriangle, X, Upload, FileSpreadsheet } from 'lucide-react';
import { useBranch } from '@/contexts/BranchContext';
import * as XLSX from 'xlsx';

export default function Inventory() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medicine | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [filteredMedicines, setFilteredMedicines] = useState<Medicine[]>([]);
  const { selectedBranch, branches } = useBranch();

  const loadMedicines = async () => {
    const data = await api.getMedicines();
    setMedicines(data);
  };

  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setUserRole(user.role);
    }
    loadMedicines();
  }, []);

  useEffect(() => {
    let result = medicines;
    
    if (selectedBranch) {
      result = result.filter(m => m.branchId === selectedBranch.id);
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(m => 
        m.name.toLowerCase().includes(lowerSearch) || 
        m.barcode.includes(search) ||
        (m.code && m.code.toLowerCase().includes(lowerSearch)) ||
        (m.manufacturer && m.manufacturer.toLowerCase().includes(lowerSearch))
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
        {userRole !== 'cashier' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <Upload className="w-5 h-5" />
              استيراد من قاعدة بيانات (SQLite)
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-purple-700 transition-colors"
            >
              <FileSpreadsheet className="w-5 h-5" />
              استيراد أدوية من Excel/CSV
            </button>
            <button
              onClick={openAddModal}
              className="bg-[#2E7D32] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-800 transition-colors"
            >
              <Plus className="w-5 h-5" />
              إضافة صنف جديد
            </button>
          </div>
        )}
      </div>

      <div className="bg-white p-3 rounded shadow-sm border border-gray-200 flex items-center gap-3">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="ابحث بالاسم، الباركود، كود الصنف، أو الشركة..."
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
              <th className="p-3 font-medium">تاريخ تحديث السعر</th>
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
                  <td className="p-3 text-gray-500 text-xs" dir="ltr">
                    {med.lastPriceUpdate ? new Date(med.lastPriceUpdate).toLocaleString('ar-EG') : '-'}
                  </td>
                  <td className="p-3 flex items-center gap-2">
                    {userRole !== 'cashier' && (
                      <>
                        <button 
                          onClick={() => {
                            setEditingMed(med);
                            setIsPriceModalOpen(true);
                          }} 
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="تحديث السعر"
                        >
                          <span className="font-bold text-xs">تحديث السعر</span>
                        </button>
                        <button onClick={() => openEditModal(med)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => med.id && handleDelete(med.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
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

      {isImportModalOpen && (
        <ImportDataModal 
          onClose={() => setIsImportModalOpen(false)} 
          onSave={loadMedicines}
          branchId={selectedBranch?.id}
        />
      )}

      {isPriceModalOpen && editingMed && (
        <PriceUpdateModal
          med={editingMed}
          onClose={() => setIsPriceModalOpen(false)}
          onSave={loadMedicines}
        />
      )}
    </div>
  );
}

function PriceUpdateModal({ med, onClose, onSave }: { med: Medicine, onClose: () => void, onSave: () => void }) {
  const [purchasePrice, setPurchasePrice] = useState(med.purchasePrice);
  const [salePrice, setSalePrice] = useState(med.salePrice);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateMedicine(med.id!, {
        ...med,
        purchasePrice,
        salePrice
      });
      alert('تم تحديث السعر بنجاح ✓');
      onSave();
      onClose();
    } catch (error) {
      alert('حدث خطأ أثناء تحديث السعر');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900">تحديث سعر الصنف</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-50 p-3 rounded border border-gray-200 mb-4">
            <p className="font-bold text-gray-800">{med.name}</p>
            <p className="text-sm text-gray-500">الباركود: {med.barcode}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">سعر الشراء الجديد</label>
            <input
              type="number"
              step="0.01"
              required
              value={purchasePrice}
              onChange={e => setPurchasePrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">سعر البيع الجديد</label>
            <input
              type="number"
              step="0.01"
              required
              value={salePrice}
              onChange={e => setSalePrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] outline-none"
            />
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
              disabled={isSaving}
              className="px-4 py-2 text-white bg-[#2E7D32] hover:bg-green-800 rounded transition-colors disabled:opacity-50"
            >
              {isSaving ? 'جاري الحفظ...' : 'حفظ التحديث'}
            </button>
          </div>
        </form>
      </div>
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
                value={formData.purchasePrice === 0 ? '' : formData.purchasePrice}
                onChange={e => setFormData({...formData, purchasePrice: e.target.value ? parseFloat(e.target.value) : 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">سعر البيع</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.salePrice === 0 ? '' : formData.salePrice}
                onChange={e => setFormData({...formData, salePrice: e.target.value ? parseFloat(e.target.value) : 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الكمية الحالية</label>
              <input
                type="number"
                required
                value={formData.quantity === 0 ? '' : formData.quantity}
                onChange={e => setFormData({...formData, quantity: e.target.value ? parseInt(e.target.value) : 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">حد الطلب (النواقص)</label>
              <input
                type="number"
                value={formData.reorderLimit === 0 ? '' : formData.reorderLimit}
                onChange={e => setFormData({...formData, reorderLimit: e.target.value ? parseInt(e.target.value) : 0})}
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

function ImportDataModal({ onClose, onSave, branchId }: { onClose: () => void, onSave: () => void, branchId?: number }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({
    name: '',
    barcode: '',
    purchasePrice: '',
    salePrice: '',
    manufacturer: '',
    unit: ''
  });

  const appFields = [
    { key: 'name', label: 'اسم الصنف (مطلوب)', required: true },
    { key: 'barcode', label: 'الباركود' },
    { key: 'salePrice', label: 'سعر البيع' },
    { key: 'purchasePrice', label: 'سعر الشراء' },
    { key: 'manufacturer', label: 'الشركة' },
    { key: 'unit', label: 'الوحدة' }
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const autoMap = (fileHeaders: string[]) => {
    const newMapping: Record<string, string> = {};
    const dict: Record<string, string[]> = {
      name: ['اسم عربي', 'اسم الصنف', 'name_ar', 'name', 'arabic_name', 'item_name', 'اسم انجليزي'],
      barcode: ['باركود دولي', 'الباركود', 'barcode', 'bar_code', 'item_code', 'code'],
      purchasePrice: ['سعر قديم', 'سعر الشراء', 'cost', 'purchase_price'],
      salePrice: ['سعر جديد', 'سعر البيع', 'price', 'selling_price'],
      manufacturer: ['الشركة', 'company', 'manufacturer'],
      unit: ['شكل صيدلاني', 'وحدات صغرى', 'الوحدة', 'unit']
    };

    for (const [key, aliases] of Object.entries(dict)) {
      const match = fileHeaders.find(h => aliases.some(a => h.toLowerCase().includes(a.toLowerCase())));
      if (match) newMapping[key] = match;
      else newMapping[key] = '';
    }
    setMapping(newMapping);
  };

  const analyzeFile = async () => {
    if (!file) {
      setError('الرجاء اختيار ملف أولاً');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      let parsedData: any[] = [];

      if (file.name.endsWith('.db') || file.name.endsWith('.sqlite')) {
        try {
          const result = await api.extractMedicinesDb(file);
          parsedData = result.rows;
        } catch (err: any) {
          throw new Error(err.message || 'فشل استخراج البيانات من قاعدة البيانات');
        }
      } else {
        parsedData = await new Promise<any[]>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const data = e.target?.result;
              let result: any[] = [];
              if (file.name.endsWith('.json')) {
                result = JSON.parse(data as string);
              } else {
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                result = XLSX.utils.sheet_to_json(worksheet);
              }
              resolve(result);
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = () => reject(new Error('فشل قراءة الملف'));
          if (file.name.endsWith('.json')) {
            reader.readAsText(file);
          } else {
            reader.readAsBinaryString(file);
          }
        });
      }

      if (!Array.isArray(parsedData) || parsedData.length === 0) {
        throw new Error('الملف فارغ أو التنسيق غير صحيح');
      }

      const fileHeaders = Object.keys(parsedData[0]);
      setHeaders(fileHeaders);
      setRawData(parsedData);
      autoMap(fileHeaders);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء قراءة الملف');
    } finally {
      setIsUploading(false);
    }
  };

  const processImport = async () => {
    if (!mapping.name) {
      setError('يجب تحديد حقل "اسم الصنف" على الأقل');
      return;
    }

    setIsUploading(true);
    setStep(3);
    setError('');

    try {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      const defaultExpiry = nextYear.toISOString().split('T')[0];

      const mappedMedicines = rawData.map((row: any) => {
        const nameVal = mapping.name ? row[mapping.name] : '';
        return {
          code: 'MED-' + Math.floor(Math.random() * 1000000),
          barcode: mapping.barcode ? (row[mapping.barcode] || '') : '',
          name: nameVal || 'بدون اسم',
          unit: mapping.unit ? (row[mapping.unit] || 'علبة') : 'علبة',
          purchasePrice: mapping.purchasePrice ? parseFloat(row[mapping.purchasePrice] || 0) : 0,
          salePrice: mapping.salePrice ? parseFloat(row[mapping.salePrice] || 0) : 0,
          quantity: 50, // Default 50
          reorderLimit: 10,
          expiryDate: defaultExpiry, // Default 1 year
          manufacturer: mapping.manufacturer ? (row[mapping.manufacturer] || '') : '',
          branchId: branchId || 1,
          storeId: 1
        };
      });

      const batchSize = 100;
      let totalImported = 0;
      let allErrors: string[] = [];

      for (let i = 0; i < mappedMedicines.length; i += batchSize) {
        const batch = mappedMedicines.slice(i, i + batchSize);
        try {
          const res = await api.importMedicinesBatch(batch);
          totalImported += res.count;
          if (res.errors) {
            allErrors = [...allErrors, ...res.errors];
          }
        } catch (err: any) {
          allErrors.push(`خطأ في الدفعة ${i / batchSize + 1}: ${err.message}`);
        }
        setProgress(Math.round(((i + batch.length) / mappedMedicines.length) * 100));
      }

      let msg = `تم استيراد ${totalImported} صنف بنجاح.`;
      if (allErrors.length > 0) {
        msg += `\n\nيوجد بعض الأخطاء:\n${allErrors.slice(0, 5).join('\n')}${allErrors.length > 5 ? '\n...والمزيد' : ''}`;
      }
      alert(msg);
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير معروف');
      setStep(2);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-purple-600" />
            استيراد أدوية من ملف
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 text-red-600 text-sm bg-red-50 p-3 rounded border border-red-200 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm border border-blue-100">
                <p className="font-bold mb-2">الخطوة 1: اختيار الملف</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>الملفات المدعومة: Excel (.xlsx), CSV, JSON, SQLite (.db, .sqlite)</li>
                  <li>سيتم إضافة الأصناف إلى الفرع الحالي تلقائياً.</li>
                  <li>سيتم تعيين الكمية الافتراضية إلى 50 وتاريخ الصلاحية بعد سنة من اليوم.</li>
                </ul>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  accept=".xlsx,.xls,.csv,.json,.db,.sqlite"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isUploading}
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-3">
                  <Upload className="w-10 h-10 text-gray-400" />
                  <span className="text-gray-600 font-medium">
                    {file ? file.name : 'اضغط لاختيار ملف أو قم بسحبه وإفلاته هنا'}
                  </span>
                </label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-purple-50 text-purple-800 p-4 rounded-lg text-sm border border-purple-100">
                <p className="font-bold mb-1">الخطوة 2: مطابقة الأعمدة (Column Mapping)</p>
                <p>قم باختيار العمود المناسب من ملفك لكل حقل في النظام. لقد قمنا بمحاولة مطابقتها تلقائياً.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {appFields.map(field => (
                  <div key={field.key} className="bg-gray-50 p-3 rounded border border-gray-200">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {field.label}
                    </label>
                    <select
                      value={mapping[field.key]}
                      onChange={(e) => setMapping({...mapping, [field.key]: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 outline-none bg-white"
                    >
                      <option value="">-- تجاهل هذا الحقل --</option>
                      {headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 py-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 text-purple-600 mb-4">
                  <Upload className="w-8 h-8 animate-bounce" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">جاري استيراد البيانات...</h3>
                <p className="text-gray-500 text-sm">يرجى الانتظار، قد تستغرق هذه العملية بعض الوقت حسب حجم الملف.</p>
              </div>
              
              <div className="space-y-2 max-w-md mx-auto">
                <div className="flex justify-between text-sm font-bold text-gray-700">
                  <span>التقدم</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div className="bg-purple-600 h-3 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded font-medium transition-colors disabled:opacity-50"
          >
            إلغاء
          </button>
          
          {step === 1 && (
            <button
              onClick={analyzeFile}
              disabled={!file || isUploading}
              className="px-6 py-2 text-white bg-purple-600 hover:bg-purple-700 rounded font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isUploading ? 'جاري القراءة...' : 'التالي'}
            </button>
          )}

          {step === 2 && (
            <button
              onClick={processImport}
              disabled={isUploading}
              className="px-6 py-2 text-white bg-green-600 hover:bg-green-700 rounded font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              بدء الاستيراد
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
