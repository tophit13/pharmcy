import React, { useState, useEffect, useRef } from 'react';
import { api, Medicine, Supplier, SaleItem } from '@/lib/api';
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
  Printer
} from 'lucide-react';

export default function PurchaseInvoice() {
  const [items, setItems] = useState<SaleItem[]>([]);
  const [barcode, setBarcode] = useState('');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  // Invoice Details
  const [invoiceType, setInvoiceType] = useState<'cash' | 'credit'>('cash');
  const [selectedSupplier, setSelectedSupplier] = useState<number | ''>('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountValue, setDiscountValue] = useState(0);
  const [extraFees, setExtraFees] = useState(0);
  const [notes, setNotes] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
    barcodeInputRef.current?.focus();
  }, []);

  const loadData = async () => {
    const [meds, supps] = await Promise.all([
      api.getMedicines(),
      api.getSuppliers()
    ]);
    setMedicines(meds);
    setSuppliers(supps);
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode) return;

    const med = medicines.find(m => m.barcode === barcode || m.code === barcode);
    if (med) {
      addItem(med);
    } else {
      alert('الصنف غير موجود. يمكنك إضافته من شاشة الأصناف.');
    }
    setBarcode('');
  };

  const addItem = (med: Medicine) => {
    const existing = items.find(i => i.medicineId === med.id);
    if (existing) {
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
        price: med.purchasePrice,
        total: med.purchasePrice,
        discountPercent: 0,
        discountValue: 0
      }]);
    }
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItemQty = (index: number, qty: number) => {
    if (qty <= 0) return;
    const newItems = [...items];
    newItems[index].quantity = qty;
    newItems[index].total = qty * newItems[index].price;
    setItems(newItems);
  };

  const updateItemPrice = (index: number, price: number) => {
    if (price < 0) return;
    const newItems = [...items];
    newItems[index].price = price;
    newItems[index].total = newItems[index].quantity * price;
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
    if (items.length === 0) {
      alert('الفاتورة فارغة');
      return;
    }

    try {
      await api.addPurchase({
        date: new Date().toISOString(),
        type: invoiceType,
        items,
        totalBeforeDiscount,
        discountPercent,
        discountValue: invoiceDiscountValue,
        netTotal,
        cashier: JSON.parse(localStorage.getItem('user') || '{}').username || 'غير معروف',
        supplierId: selectedSupplier ? Number(selectedSupplier) : undefined,
        storeId: 1
      });
      
      alert('تم حفظ فاتورة المشتريات بنجاح');
      setItems([]);
      setBarcode('');
      setDiscountPercent(0);
      setDiscountValue(0);
      setExtraFees(0);
      setNotes('');
      loadData();
      barcodeInputRef.current?.focus();
    } catch (e: any) {
      alert('حدث خطأ أثناء حفظ الفاتورة: ' + e.message);
    }
  };

  return (
    <div className="flex h-full bg-[#f0f0f0]">
      {/* Right Sidebar (Icons) */}
      <div className="w-16 bg-gray-200 border-l border-gray-300 flex flex-col items-center py-4 gap-4">
        <button className="p-2 hover:bg-gray-300 rounded" title="الأصناف"><ShoppingCart className="w-8 h-8 text-blue-700" /></button>
        <button className="p-2 bg-gray-300 rounded border-2 border-orange-400" title="المشتريات"><Radio className="w-8 h-8 text-orange-600" /></button>
        <button className="p-2 hover:bg-gray-300 rounded" title="المبيعات"><TrendingUp className="w-8 h-8 text-green-700" /></button>
        <button className="p-2 hover:bg-gray-300 rounded" title="توريد نقدى"><Banknote className="w-8 h-8 text-green-600" /></button>
        <button className="p-2 hover:bg-gray-300 rounded" title="العملاء"><Users className="w-8 h-8 text-purple-600" /></button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-2 gap-2 overflow-hidden">
        {/* Top Section */}
        <div className="bg-white border border-gray-300 p-2 text-sm flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 border border-gray-300 p-1 rounded">
            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="type" checked={invoiceType === 'cash'} onChange={() => setInvoiceType('cash')} /> كاش</label>
            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="type" checked={invoiceType === 'credit'} onChange={() => setInvoiceType('credit')} /> آجل</label>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="font-bold">مخزن الإستلام:</span>
            <select className="border border-gray-300 rounded px-2 py-1 bg-gray-50">
              <option>المخزن الرئيسي</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-orange-800 text-lg">فاتورة مشتريات</span>
          </div>

          <div className="flex items-center gap-2 mr-auto">
            <span className="font-bold">المستخدم:</span>
            <select className="border border-gray-300 rounded px-2 py-1 bg-gray-50">
              <option>{JSON.parse(localStorage.getItem('user') || '{}').username || 'مدير النظام'}</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold">المورد:</span>
            <select 
              className="border border-gray-300 rounded px-2 py-1 bg-gray-50 min-w-[150px]"
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">اختر المورد...</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Barcode Input */}
        <div className="bg-white border border-gray-300 p-2 flex items-center gap-2">
          <span className="font-bold text-sm">الباركود:</span>
          <form onSubmit={handleBarcodeSubmit} className="flex-1">
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-orange-500 bg-yellow-50"
              placeholder="مرر الباركود هنا..."
              autoFocus
            />
          </form>
        </div>

        {/* Grid */}
        <div className="flex-1 bg-white border border-gray-300 overflow-auto">
          <table className="w-full text-right text-sm border-collapse">
            <thead className="bg-[#2E7D32] text-white sticky top-0">
              <tr>
                <th className="border border-gray-400 p-1">م</th>
                <th className="border border-gray-400 p-1">كود الصنف</th>
                <th className="border border-gray-400 p-1">اسم الصنف</th>
                <th className="border border-gray-400 p-1">الوحدة</th>
                <th className="border border-gray-400 p-1">تاريخ الصلاحية</th>
                <th className="border border-gray-400 p-1">الكمية</th>
                <th className="border border-gray-400 p-1">سعر الشراء</th>
                <th className="border border-gray-400 p-1">سعر البيع</th>
                <th className="border border-gray-400 p-1">الرصيد</th>
                <th className="border border-gray-400 p-1">خصم %</th>
                <th className="border border-gray-400 p-1">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const med = medicines.find(m => m.id === item.medicineId);
                const itemTotalBeforeDiscount = item.total;
                const itemNetTotal = itemTotalBeforeDiscount - (item.discountValue || 0);

                return (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 p-1 text-center">{idx + 1}</td>
                    <td className="border border-gray-300 p-1">{med?.code}</td>
                    <td className="border border-gray-300 p-1 font-bold text-orange-800">{item.name}</td>
                    <td className="border border-gray-300 p-1">{med?.unit || 'علبة'}</td>
                    <td className="border border-gray-300 p-1">{med?.expiryDate}</td>
                    <td className="border border-gray-300 p-1">
                      <input 
                        type="number" 
                        value={item.quantity}
                        onChange={(e) => updateItemQty(idx, parseInt(e.target.value) || 1)}
                        className="w-16 border border-gray-300 px-1 text-center"
                        min="1"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input 
                        type="number" 
                        value={item.price}
                        onChange={(e) => updateItemPrice(idx, parseFloat(e.target.value) || 0)}
                        className="w-20 border border-gray-300 px-1 text-center"
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">{med?.salePrice.toFixed(2)}</td>
                    <td className="border border-gray-300 p-1 text-center">{med?.quantity}</td>
                    <td className="border border-gray-300 p-1">
                      <input 
                        type="number" 
                        value={item.discountPercent || 0}
                        onChange={(e) => updateItemDiscount(idx, parseFloat(e.target.value) || 0)}
                        className="w-12 border border-gray-300 px-1 text-center"
                        min="0" max="100"
                      />
                    </td>
                    <td className="border border-gray-300 p-1 font-bold">{itemNetTotal.toFixed(2)}</td>
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
              value={discountPercent} 
              onChange={e => setDiscountPercent(parseFloat(e.target.value) || 0)}
              className="border border-gray-400 px-1 py-1 w-16 text-center" 
            />
          </div>
          <div className="flex items-center gap-1">
            <span>خصم قيمة:</span>
            <input 
              type="number" 
              value={discountValue} 
              onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
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
              value={extraFees} 
              onChange={e => setExtraFees(parseFloat(e.target.value) || 0)}
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
        <button onClick={handleSave} className="bg-gray-100 border border-gray-400 hover:bg-gray-300 p-2 flex flex-col items-center gap-1 rounded">
          <Save className="w-6 h-6 text-green-600" /> حفظ
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
        <button className="bg-gray-100 border border-gray-400 hover:bg-gray-300 p-2 flex flex-col items-center gap-1 rounded">
          <XCircle className="w-6 h-6 text-red-600" /> إغلاق
        </button>
        <button className="bg-gray-100 border border-gray-400 hover:bg-gray-300 p-2 flex flex-col items-center gap-1 rounded mt-auto">
          <Printer className="w-6 h-6 text-gray-800" /> طباعة الاستخدام
        </button>
      </div>
    </div>
  );
}
