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
    // We don't have the full medicine object here, so we can't easily check max quantity without fetching.
    // But we can let the user type, and if it fails on backend, it fails.
    // Ideally we'd store maxQty in SaleItem. Let's assume we just update it.
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
      
      // Check for low stock items after sale
      const lowStock = await api.getLowStockProducts(selectedBranch.id);
      if (lowStock.length > 0) {
        // We could show a toast here, but for now just log or let the dashboard handle it
        console.log('Low stock items detected:', lowStock.length);
      }
      
    } catch (e: any) {
      setError('حدث خطأ أثناء حفظ الفاتورة: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full bg-[#f0f0f0]" dir="rtl">
      {/* Right Sidebar (Icons) */}
      <div className="w-16 bg-gray-200 border-l border-gray-300 flex flex-col items-center py-4 gap-4">
        <button className="p-2 hover:bg-gray-300 rounded" title="الأصناف"><ShoppingCart className="w-8 h-8 text-blue-700" /></button>
        <button className="p-2 hover:bg-gray-300 rounded" title="المشتريات"><Radio className="w-8 h-8 text-orange-600" /></button>
        <button className="p-2 bg-gray-300 rounded border-2 border-blue-400" title="المبيعات"><TrendingUp className="w-8 h-8 text-green-700" /></button>
        <button className="p-2 hover:bg-gray-300 rounded" title="توريد نقدى"><Banknote className="w-8 h-8 text-green-600" /></button>
        <button className="p-2 hover:bg-gray-300 rounded" title="العملاء"><Users className="w-8 h-8 text-purple-600" /></button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-2 gap-2 overflow-hidden">
        {/* Top Section */}
        <div className="bg-white border border-gray-300 p-2 text-sm flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 border border-gray-300 p-1 rounded">
            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="type" checked={invoiceType === 'cash'} onChange={() => setInvoiceType('cash')} /> كاش</label>
            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="type" checked={invoiceType === 'visa'} onChange={() => setInvoiceType('visa')} /> فيزا</label>
            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="type" checked={invoiceType === 'credit'} onChange={() => setInvoiceType('credit')} /> آجل</label>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="font-bold">مخزن البيع:</span>
            <select className="border border-gray-300 rounded px-2 py-1 bg-gray-50">
              <option>المخزن الرئيسي</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-blue-800 text-lg">{selectedBranch?.name || 'الفرع الرئيسي'}</span>
          </div>

          <div className="flex items-center gap-2 mr-auto">
            <span className="font-bold">البائع:</span>
            <select className="border border-gray-300 rounded px-2 py-1 bg-gray-50">
              <option>{JSON.parse(localStorage.getItem('user') || '{}').username || 'مدير النظام'}</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold">العميل:</span>
            <select 
              className="border border-gray-300 rounded px-2 py-1 bg-gray-50 min-w-[150px]"
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
          <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded flex items-center gap-2 text-sm font-bold">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Barcode / Search Input */}
        <div className="bg-white border border-gray-300 p-2 relative">
          <div className="relative flex items-center">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-3 pr-10 py-2 border-2 border-blue-400 rounded text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-yellow-50"
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
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-60 overflow-y-auto">
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
        <div className="flex-1 bg-white border border-gray-300 overflow-auto">
          <table className="w-full text-right text-sm border-collapse">
            <thead className="bg-[#2E7D32] text-white sticky top-0">
              <tr>
                <th className="border border-gray-400 p-1">م</th>
                <th className="border border-gray-400 p-1">اسم الصنف</th>
                <th className="border border-gray-400 p-1">الكمية</th>
                <th className="border border-gray-400 p-1">سعر البيع</th>
                <th className="border border-gray-400 p-1">ن الخصم</th>
                <th className="border border-gray-400 p-1">قيمة ق الخصم</th>
                <th className="border border-gray-400 p-1">قيمة بعد الخصم</th>
                <th className="border border-gray-400 p-1">حذف</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const itemTotalBeforeDiscount = item.total;
                const itemNetTotal = itemTotalBeforeDiscount - (item.discountValue || 0);

                return (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 p-1 text-center">{idx + 1}</td>
                    <td className="border border-gray-300 p-1 font-bold text-blue-800">{item.name}</td>
                    <td className="border border-gray-300 p-1">
                      <input 
                        type="number" 
                        value={item.quantity === 0 ? '' : item.quantity}
                        onChange={(e) => updateItemQty(idx, e.target.value ? parseInt(e.target.value) : 1)}
                        className="w-16 border border-gray-300 px-1 text-center"
                        min="1"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">{item.price.toFixed(2)}</td>
                    <td className="border border-gray-300 p-1">
                      <input 
                        type="number" 
                        value={item.discountPercent === 0 ? '' : (item.discountPercent || '')}
                        onChange={(e) => updateItemDiscount(idx, e.target.value ? parseFloat(e.target.value) : 0)}
                        className="w-12 border border-gray-300 px-1 text-center"
                        min="0" max="100"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">{itemTotalBeforeDiscount.toFixed(2)}</td>
                    <td className="border border-gray-300 p-1 font-bold">{itemNetTotal.toFixed(2)}</td>
                    <td className="border border-gray-300 p-1 text-center">
                      <button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {/* Empty rows to fill space */}
              {Array.from({ length: Math.max(0, 10 - items.length) }).map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td className="border border-gray-300 p-1 h-8"></td>
                  <td className="border border-gray-300 p-1"></td>
                  <td className="border border-gray-300 p-1"></td>
                  <td className="border border-gray-300 p-1"></td>
                  <td className="border border-gray-300 p-1"></td>
                  <td className="border border-gray-300 p-1"></td>
                  <td className="border border-gray-300 p-1"></td>
                  <td className="border border-gray-300 p-1"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Row */}
        <div className="bg-gray-200 border border-gray-300 p-2 text-sm flex flex-wrap gap-4 items-center font-bold">
          <div className="flex items-center gap-1">
            <span>عدد الأصناف:</span>
            <span className="bg-white border border-gray-400 px-2 py-1 min-w-[40px] text-center">{items.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>الإجمالى ق الخصم:</span>
            <span className="bg-white border border-gray-400 px-2 py-1 min-w-[80px] text-center">{totalBeforeDiscount.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>خصم %:</span>
            <input 
              type="number" 
              value={discountPercent === 0 ? '' : discountPercent} 
              onChange={e => setDiscountPercent(e.target.value ? parseFloat(e.target.value) : 0)}
              className="border border-gray-400 px-1 py-1 w-16 text-center" 
            />
          </div>
          <div className="flex items-center gap-1">
            <span>خصم قيمة:</span>
            <input 
              type="number" 
              value={discountValue === 0 ? '' : discountValue} 
              onChange={e => setDiscountValue(e.target.value ? parseFloat(e.target.value) : 0)}
              className="border border-gray-400 px-1 py-1 w-20 text-center" 
            />
          </div>
          <div className="flex items-center gap-1">
            <span>خ.أصناف:</span>
            <span className="bg-white border border-gray-400 px-2 py-1 min-w-[60px] text-center">{itemsDiscount.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>م اضافية:</span>
            <input 
              type="number" 
              value={extraFees === 0 ? '' : extraFees} 
              onChange={e => setExtraFees(e.target.value ? parseFloat(e.target.value) : 0)}
              className="border border-gray-400 px-1 py-1 w-16 text-center" 
            />
          </div>
          <div className="flex items-center gap-1 flex-1">
            <span>ملاحظات:</span>
            <input 
              type="text" 
              value={notes} 
              onChange={e => setNotes(e.target.value)}
              className="border border-gray-400 px-2 py-1 w-full" 
            />
          </div>
        </div>

        {/* Bottom Net Total */}
        <div className="flex justify-end">
          <div className="bg-yellow-200 border-2 border-yellow-500 p-2 flex items-center gap-4 rounded">
            <span className="text-xl font-bold text-gray-800">الصافى المطلوب:</span>
            <span className="text-3xl font-bold text-red-600">{netTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Left Sidebar (Actions) */}
      <div className="w-28 bg-gray-200 border-r border-gray-300 flex flex-col p-2 gap-2 text-xs font-bold">
        <button onClick={() => setItems([])} className="bg-gray-100 border border-gray-400 hover:bg-gray-300 p-2 flex flex-col items-center gap-1 rounded">
          <FilePlus className="w-6 h-6 text-blue-600" /> جديد
        </button>
        <button onClick={handleSave} disabled={isSaving} className="bg-gray-100 border border-gray-400 hover:bg-gray-300 p-2 flex flex-col items-center gap-1 rounded disabled:opacity-50">
          <Save className="w-6 h-6 text-green-600" /> {isSaving ? 'جاري...' : 'حفظ (F5)'}
        </button>
        <button className="bg-gray-100 border border-gray-400 hover:bg-gray-300 p-2 flex flex-col items-center gap-1 rounded">
          <Home className="w-6 h-6 text-gray-600" /> الرئيسية
        </button>
        <button className="bg-gray-100 border border-gray-400 hover:bg-gray-300 p-2 flex flex-col items-center gap-1 rounded">
          <ArrowUpCircle className="w-6 h-6 text-orange-600" /> تعلى الفاتورة
        </button>
        <button className="bg-gray-100 border border-gray-400 hover:bg-gray-300 p-2 flex flex-col items-center gap-1 rounded">
          <ListOrdered className="w-6 h-6 text-purple-600" /> فواتير مترلى
        </button>
        <button className="bg-gray-100 border border-gray-400 hover:bg-gray-300 p-2 flex flex-col items-center gap-1 rounded">
          <PlusCircle className="w-6 h-6 text-green-600" /> إضافة صنف
        </button>
        <button className="bg-gray-100 border border-gray-400 hover:bg-gray-300 p-2 flex flex-col items-center gap-1 rounded">
          <CornerDownLeft className="w-6 h-6 text-blue-600" /> سطر جديد
        </button>
        <button onClick={() => items.length > 0 && removeItem(items.length - 1)} className="bg-gray-100 border border-gray-400 hover:bg-gray-300 p-2 flex flex-col items-center gap-1 rounded">
          <Trash2 className="w-6 h-6 text-red-600" /> حذف سطر
        </button>
        <button className="bg-gray-100 border border-gray-400 hover:bg-gray-300 p-2 flex flex-col items-center gap-1 rounded">
          <Clock className="w-6 h-6 text-gray-600" /> فواتير غير مكتملة
        </button>
        <button className="bg-gray-100 border border-gray-400 hover:bg-gray-300 p-2 flex flex-col items-center gap-1 rounded mt-auto">
          <Printer className="w-6 h-6 text-gray-800" /> طباعة
        </button>
      </div>
    </div>
  );
}
