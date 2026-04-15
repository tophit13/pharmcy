import React, { useState, useEffect, useRef } from 'react';
import { api, Medicine, Branch } from '@/lib/api';
import { useBranch } from '@/contexts/BranchContext';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { Search, ArrowLeftRight, Trash2, Save, AlertTriangle } from 'lucide-react';

interface TransferItem extends Medicine {
  transferQuantity: number;
}

export default function TransferStock() {
  const { selectedBranch } = useBranch();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [destinationBranch, setDestinationBranch] = useState<number | ''>('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Medicine[]>([]);
  const [pendingItems, setPendingItems] = useState<TransferItem[]>([]);
  
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [notes, setNotes] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBranches();
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F5') {
        e.preventDefault();
        if (pendingItems.length > 0 && !isSaving) {
          handleSave();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSearchQuery('');
        setSearchResults([]);
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingItems, isSaving]);

  const loadBranches = async () => {
    try {
      const data = await api.getBranches();
      setBranches(data);
    } catch (err) {
      console.error('Failed to load branches', err);
    }
  };

  const handleScan = async (barcode: string) => {
    if (!selectedBranch) return;
    setSearchQuery(barcode);
    searchProduct(barcode);
  };

  useBarcodeScanner({ onScan: handleScan });

  const searchProduct = async (query: string) => {
    if (!query.trim() || !selectedBranch) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    setError('');
    try {
      const results = await api.searchProducts(query, selectedBranch.id);
      setSearchResults(results);
      if (results.length === 1) {
        handleSelectItem(results[0]);
      }
    } catch (err: any) {
      setError('فشل البحث عن الصنف');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    
    const timeoutId = setTimeout(() => {
      searchProduct(val);
    }, 300);
    return () => clearTimeout(timeoutId);
  };

  const handleSelectItem = (med: Medicine) => {
    if (med.quantity <= 0) {
      setError(`الصنف "${med.name}" غير متوفر في المخزن!`);
      setTimeout(() => setError(''), 3000);
      setSearchQuery('');
      setSearchResults([]);
      return;
    }

    const existing = pendingItems.find(item => item.id === med.id);
    if (existing) {
      if (existing.transferQuantity >= med.quantity) {
        setError(`الكمية المطلوبة من "${med.name}" غير متوفرة! المتاح: ${med.quantity}`);
        setTimeout(() => setError(''), 3000);
        return;
      }
      setPendingItems(pendingItems.map(item => 
        item.id === med.id 
          ? { ...item, transferQuantity: item.transferQuantity + 1 }
          : item
      ));
    } else {
      setPendingItems([{
        ...med,
        transferQuantity: 1
      }, ...pendingItems]);
    }
    
    setSearchQuery('');
    setSearchResults([]);
    
    setTimeout(() => {
      const qtyInputs = document.querySelectorAll('.qty-input');
      if (qtyInputs.length > 0) {
        (qtyInputs[0] as HTMLInputElement).focus();
        (qtyInputs[0] as HTMLInputElement).select();
      }
    }, 50);
  };

  const updatePendingItem = (id: number, qty: number) => {
    const med = pendingItems.find(item => item.id === id);
    if (med && qty > med.quantity) {
      setError(`الكمية المطلوبة من "${med.name}" غير متوفرة! المتاح: ${med.quantity}`);
      setTimeout(() => setError(''), 3000);
      return;
    }
    setPendingItems(pendingItems.map(item => 
      item.id === id ? { ...item, transferQuantity: qty } : item
    ));
  };

  const removePendingItem = (id: number) => {
    setPendingItems(pendingItems.filter(item => item.id !== id));
    searchInputRef.current?.focus();
  };

  const handleSave = async () => {
    if (!selectedBranch) {
      setError('الرجاء تحديد الفرع المحول منه أولاً');
      return;
    }
    if (!destinationBranch) {
      setError('الرجاء تحديد الفرع المحول إليه');
      return;
    }
    if (selectedBranch.id === destinationBranch) {
      setError('لا يمكن التحويل لنفس الفرع');
      return;
    }
    if (pendingItems.length === 0) {
      setError('لا يوجد أصناف للتحويل');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const items = pendingItems.map(item => ({
        productId: item.id,
        quantity: item.transferQuantity
      }));

      await api.createStockTransfer({
        fromBranchId: selectedBranch.id,
        toBranchId: destinationBranch,
        notes,
        items
      });

      setSuccess('تم نقل المخزون بنجاح ✓');
      setPendingItems([]);
      setNotes('');
      setDestinationBranch('');
      searchInputRef.current?.focus();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'فشل حفظ عملية النقل');
    } finally {
      setIsSaving(false);
    }
  };

  if (!selectedBranch) {
    return (
      <div className="p-8 text-center bg-white rounded shadow-sm border border-gray-200">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800">الرجاء تحديد الفرع أولاً</h2>
        <p className="text-gray-600 mt-2">يجب تحديد الفرع من القائمة العلوية للتمكن من نقل المخزون.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="flex justify-between items-center bg-white p-4 rounded shadow-sm border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
            <ArrowLeftRight className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">نقل مخزون بين الفروع</h1>
            <p className="text-sm text-gray-500">نقل أصناف من {selectedBranch.name} إلى فرع آخر</p>
          </div>
        </div>
        <div className="text-sm text-gray-500 flex gap-4">
          <span><kbd className="bg-gray-100 border border-gray-300 px-2 py-1 rounded text-xs">F2</kbd> بحث</span>
          <span><kbd className="bg-gray-100 border border-gray-300 px-2 py-1 rounded text-xs">F5</kbd> حفظ</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded font-bold">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar: Transfer Details */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-4 rounded shadow-sm border border-gray-200 space-y-4">
            <h2 className="font-bold text-gray-800 border-b pb-2">بيانات التحويل</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">من فرع</label>
              <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded text-gray-700 cursor-not-allowed">
                {selectedBranch.name}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">إلى فرع</label>
              <select
                value={destinationBranch}
                onChange={(e) => setDestinationBranch(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-600 outline-none"
              >
                <option value="">-- اختر الفرع المحول إليه --</option>
                {branches.filter(b => b.id !== selectedBranch.id).map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-600 outline-none resize-none h-24"
                placeholder="سبب التحويل، اسم المستلم..."
              ></textarea>
            </div>

            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <div className="text-sm text-gray-500 mt-2">عدد الأصناف المحولة: {pendingItems.length}</div>
            </div>

            <button
              onClick={handleSave}
              disabled={pendingItems.length === 0 || !destinationBranch || isSaving}
              className="w-full bg-blue-700 text-white py-3 rounded font-bold hover:bg-blue-800 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
            >
              <Save className="w-5 h-5" />
              {isSaving ? 'جاري الحفظ...' : 'حفظ التحويل (F5)'}
            </button>
          </div>
        </div>

        {/* Main Area: Search and Items List */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white p-4 rounded shadow-sm border border-gray-200 relative">
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Search className="h-6 w-6 text-gray-400" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-3 pr-12 py-4 border-2 border-blue-600 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent shadow-sm"
                placeholder="امسح الباركود أو ابحث باسم الصنف..."
                dir="rtl"
              />
              {isSearching && (
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && searchQuery && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map(med => (
                  <div 
                    key={med.id} 
                    onClick={() => handleSelectItem(med)}
                    className="p-3 border-b border-gray-100 hover:bg-blue-50 cursor-pointer flex justify-between items-center"
                  >
                    <div>
                      <div className="font-bold text-gray-800">{med.name}</div>
                      <div className="text-sm text-gray-500">باركود: {med.barcode} | كود: {med.code}</div>
                    </div>
                    <div className="text-left">
                      <div className={`text-sm font-bold ${med.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        المخزون المتاح: {med.quantity} {med.unit}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                  <tr>
                    <th className="p-3 font-bold">الصنف</th>
                    <th className="p-3 font-bold w-32">المخزون الحالي</th>
                    <th className="p-3 font-bold w-32">الكمية المحولة</th>
                    <th className="p-3 font-bold w-16 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">
                        لم يتم إضافة أصناف بعد. ابدأ بمسح الباركود أو البحث.
                      </td>
                    </tr>
                  ) : (
                    pendingItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="p-3">
                          <div className="font-bold text-gray-800">{item.name}</div>
                          <div className="text-xs text-gray-500">باركود: {item.barcode}</div>
                        </td>
                        <td className="p-3 font-bold text-gray-700">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="1"
                            max={item.quantity}
                            value={item.transferQuantity || ''}
                            onChange={(e) => updatePendingItem(item.id!, parseInt(e.target.value) || 0)}
                            className="qty-input w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-600 outline-none text-center"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <button 
                            onClick={() => removePendingItem(item.id!)}
                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
