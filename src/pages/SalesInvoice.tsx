import React, { useState, useEffect, useRef } from 'react';
import { api, Medicine, Customer, SaleItem } from '@/lib/api';
import { useBranch } from '@/contexts/BranchContext';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { 
  ShoppingCart, 
  Radio, 
  TrendingUp, 
  Banknote, 
  Users,
  FilePlus,
  Save,
  Home,
  ArrowUpCircle,
  ListOrdered,
  PlusCircle,
  CornerDownLeft,
  Trash2,
  Clock,
  XCircle,
  Printer,
  Search,
  AlertTriangle
} from 'lucide-react';

export default function SalesInvoice() {
  const { selectedBranch } = useBranch();
  const [items, setItems] = useState<SaleItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Medicine[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState('');
  
  // Invoice Details
  const [invoiceType, setInvoiceType] = useState<'cash' | 'visa' | 'credit'>('cash');
  const [selectedCustomer, setSelectedCustomer] = useState<number | ''>('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountValue, setDiscountValue] = useState(0);
  const [extraFees, setExtraFees] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F5') {
        e.preventDefault();
        if (items.length > 0 && !isSaving) {
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
  }, [items, isSaving]);

  const loadData = async () => {
    const custs = await api.getCustomers();
    setCustomers(custs);
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

    const existing = items.find(i => i.medicineId === med.id);
    if (existing) {
      if (existing.quantity >= med.quantity) {
        setError(`الكمية المطلوبة من "${med.name}" غير متوفرة! المتاح: ${med.quantity}`);
        setTimeout(() => setError(''), 3000);
        return;
      }
      setItems(items.map(i => 
        i.medicineId === med.id 
          ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.price }
          : i
      ));
    } else {
      setItems([...items, {
        medicineId: med.id!,
        name: med.name,
        quantity: 1,
        price: med.salePrice,
        total: med.salePrice,
        discountPercent: 0,
        discountValue: 0
      }]);
    }
    
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    searchInputRef.current?.focus();
  };

  const updateItemQty = (index: number, qty: number) => {
    if (qty <= 0) return;
    const newItems = [...items];
    newItems[index].quantity = qty;
    newItems[index].total = qty * newItems[index].price;
    setItems(newItems);
  };

  const updateItemDiscount = (index: number, percent: number) => {
    const newItems = [...items];
    newItems[index].discountPercent = percent;
    newItems[index].discountValue = (newItems[index].total * percent) / 100;
    setItems(newItems);
  };

  // Calculations
  const totalBeforeDiscount = items.reduce((sum, item) => sum + item.total, 0);
  const itemsDiscount = items.reduce((sum, item) => sum + (item.discountValue || 0), 0);
  const invoiceDiscountValue = discountValue || (totalBeforeDiscount * discountPercent) / 100;
  const netTotal = totalBeforeDiscount - itemsDiscount - invoiceDiscountValue + extraFees;

  const handleSave = async () => {
    if (!selectedBranch) {
      setError('الرجاء تحديد الفرع أولاً');
      return;
    }
    if (items.length === 0) {
      setError('الفاتورة فارغة');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await api.addSale({
        date: new Date().toISOString(),
        type: invoiceType,
        items,
        totalBeforeDiscount,
        discountPercent,
        discountValue: invoiceDiscountValue,
        netTotal,
        cashier: JSON.parse(localStorage.getItem('user') || '{}').username || 'غير معروف',
        customerId: selectedCustomer ? Number(selectedCustomer) : undefined,
        storeId: 1,
        branchId: selectedBranch.id
      });
      
      setItems([]);
      setSearchQuery('');
      setDiscountPercent(0);
      setDiscountValue(0);
      setExtraFees(0);
      setNotes('');
      searchInputRef.current?.focus();
      
      const lowStock = await api.getLowStockProducts(selectedBranch.id);
      if (lowStock.length > 0) {
        console.log('Low stock items detected:', lowStock.length);
      }
      
    } catch (e: any) {
      setError('حدث خطأ أثناء حفظ الفاتورة: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full bg-[#e5e7eb]" dir="rtl">
      {/* Right Sidebar (Icons) */}
      <div className="w-16 bg-[#f3f4f6] border-l border-gray-300 flex flex-col items-center py-4 gap-4 shrink-0">
        <button className="p-2 hover:bg-gray-200 rounded" title="الأصناف"><ShoppingCart className="w-7 h-7 text-blue-700" /></button>
        <button className="p-2 hover:bg-gray-200 rounded" title="المشتريات"><Radio className="w-7 h-7 text-orange-600" /></button>
        <button className="p-2 bg-gray-200 rounded border border-blue-400" title="المبيعات"><TrendingUp className="w-7 h-7 text-green-700" /></button>
        <button className="p-2 hover:bg-gray-200 rounded" title="توريد نقدى"><Banknote className="w-7 h-7 text-green-600" /></button>
        <button className="p-2 hover:bg-gray-200 rounded" title="العملاء"><Users className="w-7 h-7 text-purple-600" /></button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Section */}
        <div className="bg-white border-b border-gray-300 p-2 text-sm flex flex-wrap gap-4 items-center shadow-sm z-10">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="type" checked={invoiceType === 'cash'} onChange={() => setInvoiceType('cash')} className="w-4 h-4 text-blue-600" /> كاش</label>
            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="type" checked={invoiceType === 'visa'} onChange={() => setInvoiceType('visa')} className="w-4 h-4 text-blue-600" /> فيزا</label>
            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="type" checked={invoiceType === 'credit'} onChange={() => setInvoiceType('credit')} className="w-4 h-4 text-blue-600" /> آجل</label>
          </div>
          
          <div className="flex items-center gap-2 mr-4">
            <span className="text-gray-600">مخزن البيع:</span>
            <select className="border border-gray-300 rounded px-2 py-1 bg-white min-w-[120px] focus:outline-none focus:border-blue-500">
              <option>المخزن الرئيسي</option>
            </select>
          </div>

          <div className="flex items-center gap-2 mr-4">
            <span className="font-bold text-blue-800 text-lg">{selectedBranch?.name || 'الفرع الرئيسي'}</span>
          </div>

          <div className="flex items-center gap-2 mr-auto">
            <span className="text-gray-600">البائع:</span>
            <select className="border border-gray-300 rounded px-2 py-1 bg-white min-w-[120px] focus:outline-none focus:border-blue-500">
              <option>{JSON.parse(localStorage.getItem('user') || '{}').username || 'مدير النظام'}</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-600">العميل:</span>
            <select 
              className="border border-gray-300 rounded px-2 py-1 bg-white min-w-[150px] focus:outline-none focus:border-blue-500"
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">عميل نقدي</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-b border-red-200 text-red-700 p-2 flex items-center gap-2 text-sm font-bold">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Barcode / Search Input */}
        <div className="bg-white border-b border-gray-300 p-2 relative z-10">
          <div className="relative flex items-center">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-3 pr-10 py-2 border border-blue-400 rounded text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[#fdfdfd]"
              placeholder="امسح الباركود أو ابحث باسم الصنف (F2)..."
            />
            {isSearching && (
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && searchQuery && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map(med => (
                <div 
                  key={med.id} 
                  onClick={() => handleSelectItem(med)}
                  className="p-2 border-b border-gray-100 hover:bg-blue-50 cursor-pointer flex justify-between items-center"
                >
                  <div>
                    <div className="font-bold text-gray-800">{med.name}</div>
                    <div className="text-xs text-gray-500">باركود: {med.barcode}</div>
                  </div>
                  <div className="text-left">
                    <div className="text-blue-700 font-bold">{med.salePrice} ج.م</div>
                    <div className={`text-xs font-bold ${med.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      المخزون: {med.quantity}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="flex-1 bg-white overflow-auto relative">
          <table className="w-full text-right text-sm border-collapse">
            <thead className="bg-[#2E7D32] text-white sticky top-0 z-10">
              <tr>
                <th className="border border-gray-400 p-2 font-medium w-12 text-center">م</th>
                <th className="border border-gray-400 p-2 font-medium">اسم الصنف</th>
                <th className="border border-gray-400 p-2 font-medium w-24 text-center">الكمية</th>
                <th className="border border-gray-400 p-2 font-medium w-24 text-center">سعر البيع</th>
                <th className="border border-gray-400 p-2 font-medium w-24 text-center">ن الخصم</th>
                <th className="border border-gray-400 p-2 font-medium w-32 text-center">قيمة ق الخصم</th>
                <th className="border border-gray-400 p-2 font-medium w-32 text-center">قيمة بعد الخصم</th>
                <th className="border border-gray-400 p-2 font-medium w-16 text-center">حذف</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const itemTotalBeforeDiscount = item.total;
                const itemNetTotal = itemTotalBeforeDiscount - (item.discountValue || 0);

                return (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 p-2 text-center text-gray-600">{idx + 1}</td>
                    <td className="border border-gray-300 p-2 font-bold text-blue-800">{item.name}</td>
                    <td className="border border-gray-300 p-1">
                      <input 
                        type="number" 
                        value={item.quantity === 0 ? '' : item.quantity}
                        onChange={(e) => updateItemQty(idx, e.target.value ? parseInt(e.target.value) : 1)}
                        className="w-full border border-gray-300 px-2 py-1 text-center focus:outline-none focus:border-blue-500 rounded-sm"
                        min="1"
                      />
                    </td>
                    <td className="border border-gray-300 p-2 text-center">{item.price.toFixed(2)}</td>
                    <td className="border border-gray-300 p-1">
                      <input 
                        type="number" 
                        value={item.discountPercent === 0 ? '' : (item.discountPercent || '')}
                        onChange={(e) => updateItemDiscount(idx, e.target.value ? parseFloat(e.target.value) : 0)}
                        className="w-full border border-gray-300 px-2 py-1 text-center focus:outline-none focus:border-blue-500 rounded-sm"
                        min="0" max="100"
                      />
                    </td>
                    <td className="border border-gray-300 p-2 text-center">{itemTotalBeforeDiscount.toFixed(2)}</td>
                    <td className="border border-gray-300 p-2 text-center font-bold text-gray-800">{itemNetTotal.toFixed(2)}</td>
                    <td className="border border-gray-300 p-1 text-center">
                      <button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {/* Empty rows to fill space */}
              {Array.from({ length: Math.max(0, 15 - items.length) }).map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td className="border border-gray-200 p-2 h-10"></td>
                  <td className="border border-gray-200 p-2"></td>
                  <td className="border border-gray-200 p-2"></td>
                  <td className="border border-gray-200 p-2"></td>
                  <td className="border border-gray-200 p-2"></td>
                  <td className="border border-gray-200 p-2"></td>
                  <td className="border border-gray-200 p-2"></td>
                  <td className="border border-gray-200 p-2"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Row */}
        <div className="bg-[#e5e7eb] border-t border-gray-300 p-2 text-sm flex flex-wrap gap-4 items-center shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-gray-700">عدد الأصناف:</span>
            <span className="bg-white border border-gray-300 px-3 py-1 min-w-[50px] text-center font-bold rounded-sm">{items.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-700">الإجمالى ق الخصم:</span>
            <span className="bg-white border border-gray-300 px-3 py-1 min-w-[80px] text-center font-bold rounded-sm">{totalBeforeDiscount.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-700">خصم %:</span>
            <input 
              type="number" 
              value={discountPercent === 0 ? '' : discountPercent} 
              onChange={e => setDiscountPercent(e.target.value ? parseFloat(e.target.value) : 0)}
              className="border border-gray-300 px-2 py-1 w-16 text-center focus:outline-none focus:border-blue-500 rounded-sm" 
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-700">خصم قيمة:</span>
            <input 
              type="number" 
              value={discountValue === 0 ? '' : discountValue} 
              onChange={e => setDiscountValue(e.target.value ? parseFloat(e.target.value) : 0)}
              className="border border-gray-300 px-2 py-1 w-20 text-center focus:outline-none focus:border-blue-500 rounded-sm" 
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-700">خ.أصناف:</span>
            <span className="bg-white border border-gray-300 px-3 py-1 min-w-[60px] text-center font-bold rounded-sm">{itemsDiscount.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-700">م اضافية:</span>
            <input 
              type="number" 
              value={extraFees === 0 ? '' : extraFees} 
              onChange={e => setExtraFees(e.target.value ? parseFloat(e.target.value) : 0)}
              className="border border-gray-300 px-2 py-1 w-16 text-center focus:outline-none focus:border-blue-500 rounded-sm" 
            />
          </div>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-gray-700">ملاحظات:</span>
            <input 
              type="text" 
              value={notes} 
              onChange={e => setNotes(e.target.value)}
              className="border border-gray-300 px-3 py-1 w-full focus:outline-none focus:border-blue-500 rounded-sm" 
            />
          </div>
        </div>

        {/* Bottom Net Total */}
        <div className="flex justify-between items-end shrink-0 pt-2">
          <div className="bg-[#FFEB3B] border-2 border-[#FBC02D] px-6 py-3 flex items-center gap-4 rounded-md shadow-sm">
            <span className="text-xl font-bold text-gray-800">الصافى المطلوب:</span>
            <span className="text-4xl font-bold text-red-600">{netTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Left Sidebar (Actions) */}
      <div className="w-28 bg-[#f3f4f6] border-r border-gray-300 flex flex-col p-2 gap-2 text-xs font-bold shrink-0 overflow-y-auto">
        <button onClick={() => setItems([])} className="bg-white border border-gray-300 hover:bg-blue-50 p-2 flex flex-col items-center gap-1 rounded shadow-sm transition-colors">
          <FilePlus className="w-6 h-6 text-blue-600" /> جديد
        </button>
        <button onClick={handleSave} disabled={isSaving} className="bg-white border border-gray-300 hover:bg-green-50 p-2 flex flex-col items-center gap-1 rounded shadow-sm transition-colors disabled:opacity-50">
          <Save className="w-6 h-6 text-green-600" /> {isSaving ? 'جاري...' : 'حفظ (F5)'}
        </button>
        <button className="bg-white border border-gray-300 hover:bg-gray-100 p-2 flex flex-col items-center gap-1 rounded shadow-sm transition-colors">
          <Home className="w-6 h-6 text-gray-600" /> الرئيسية
        </button>
        <button className="bg-white border border-gray-300 hover:bg-orange-50 p-2 flex flex-col items-center gap-1 rounded shadow-sm transition-colors">
          <ArrowUpCircle className="w-6 h-6 text-orange-600" /> تعلى الفاتورة
        </button>
        <button className="bg-white border border-gray-300 hover:bg-purple-50 p-2 flex flex-col items-center gap-1 rounded shadow-sm transition-colors">
          <ListOrdered className="w-6 h-6 text-purple-600" /> فواتير مترلى
        </button>
        <button className="bg-white border border-gray-300 hover:bg-green-50 p-2 flex flex-col items-center gap-1 rounded shadow-sm transition-colors">
          <PlusCircle className="w-6 h-6 text-green-600" /> إضافة صنف
        </button>
        <button onClick={() => {
          setItems([...items, {
            medicineId: 0,
            name: '',
            quantity: 1,
            price: 0,
            total: 0,
            discountPercent: 0,
            discountValue: 0
          }]);
        }} className="bg-white border border-gray-300 hover:bg-blue-50 p-2 flex flex-col items-center gap-1 rounded shadow-sm transition-colors">
          <CornerDownLeft className="w-6 h-6 text-blue-600" /> سطر جديد
        </button>
        <button onClick={() => items.length > 0 && removeItem(items.length - 1)} className="bg-white border border-gray-300 hover:bg-red-50 p-2 flex flex-col items-center gap-1 rounded shadow-sm transition-colors">
          <Trash2 className="w-6 h-6 text-red-600" /> حذف سطر
        </button>
        <button className="bg-white border border-gray-300 hover:bg-gray-100 p-2 flex flex-col items-center gap-1 rounded shadow-sm transition-colors">
          <Clock className="w-6 h-6 text-gray-600" /> فواتير غير مكتملة
        </button>
        <button className="bg-white border border-gray-300 hover:bg-red-50 p-2 flex flex-col items-center gap-1 rounded shadow-sm transition-colors mt-auto">
          <Printer className="w-6 h-6 text-gray-800" /> طباعة
        </button>
      </div>
    </div>
  );
}
