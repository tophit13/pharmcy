import React, { useState, useEffect, useRef } from 'react';
import { api, Medicine, SaleItem } from '@/lib/api';
import { Search, Camera, Trash2, Printer, Plus, Minus } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useBranch } from '@/contexts/BranchContext';

export default function POS() {
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Medicine[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const { selectedBranch } = useBranch();

  useEffect(() => {
    api.getMedicines().then(setMedicines);
  }, []);

  const total = cart.reduce((sum, item) => sum + item.total, 0);

  // Handle USB Barcode Scanner (Keyboard input)
  useEffect(() => {
    let barcode = '';
    let timeout: NodeJS.Timeout;

    const isPrintableKey = (key: string) => key.length === 1 && !key.includes('Arrow') && !key.includes('Shift') && !key.includes('Control') && !key.includes('Alt') && !key.includes('Meta');

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null;
      if (activeElement && activeElement.tagName === 'INPUT' && activeElement !== searchInputRef.current) {
        return;
      }

      if (e.key === 'Enter' && barcode) {
        handleBarcodeScanned(barcode);
        barcode = '';
        return;
      }

      if (isPrintableKey(e.key)) {
        barcode += e.key;
      }

      clearTimeout(timeout);
      timeout = setTimeout(() => {
        barcode = '';
      }, 100);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, medicines]);

  // Handle Search Input
  useEffect(() => {
    if (search.length > 1) {
      const results = medicines.filter(m => 
        (m.branchId === selectedBranch?.id) &&
        (m.name.toLowerCase().includes(search.toLowerCase()) || 
        m.barcode.startsWith(search))
      ).slice(0, 10);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [search, medicines, selectedBranch]);

  const handleBarcodeScanned = (scannedBarcode: string) => {
    const med = medicines.find(m => m.barcode === scannedBarcode && (!selectedBranch?.id || m.branchId === selectedBranch.id));
    if (med) {
      addToCart(med);
      setSearch('');
      setSearchResults([]);
    } else {
      setSearchResults([]);
      alert('لم يتم العثور على الدواء بهذا الباركود في هذا الفرع');
    }
  };

  const addToCart = (med: Medicine) => {
    setCart(prev => {
      const existing = prev.find(item => item.medicineId === med.id);
      if (existing) {
        if (existing.quantity >= med.quantity) {
          alert('الكمية المطلوبة غير متوفرة في المخزون');
          return prev;
        }
        return prev.map(item => 
          item.medicineId === med.id 
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
            : item
        );
      }
      return [...prev, {
        medicineId: med.id!,
        name: med.name,
        quantity: 1,
        price: med.salePrice,
        total: med.salePrice
      }];
    });
    setSearch('');
    setSearchResults([]);
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.medicineId === id) {
        const newQ = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQ, total: newQ * item.price };
      }
      return item;
    }));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.medicineId !== id));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      await api.addSale({
        date: new Date().toISOString(),
        type: 'cash',
        items: cart,
        totalBeforeDiscount: total,
        discountPercent: 0,
        discountValue: 0,
        netTotal: total,
        cashier: user.username || 'Unknown',
        branchId: selectedBranch?.id
      });

      printInvoice();
      setCart([]);
      api.getMedicines().then(setMedicines); // Refresh stock
      alert('تمت عملية البيع بنجاح');
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء إتمام البيع');
    }
  };

  const printInvoice = () => {
    const printContent = document.getElementById('invoice-print-area');
    if (printContent) {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  };

  useEffect(() => {
    if (isScanning) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 150 } },
        false
      );
      
      scanner.render((decodedText) => {
        handleBarcodeScanned(decodedText);
        scanner.clear();
        setIsScanning(false);
      }, () => {});

      return () => {
        scanner.clear().catch(console.error);
      };
    }
  }, [isScanning]);

  return (
    <div className="flex h-full bg-gray-50">
      <div className="w-1/3 bg-white shadow-lg flex flex-col border-l border-gray-200 z-10">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900">الفاتورة الحالية</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
              <ShoppingCartIcon className="w-16 h-16 opacity-20" />
              <p>الفاتورة فارغة</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.medicineId} className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-gray-900">{item.name}</h3>
                  <button onClick={() => removeFromCart(item.medicineId)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                    <button onClick={() => updateQuantity(item.medicineId, 1)} className="p-1 bg-white rounded shadow-sm hover:bg-gray-100">
                      <Plus className="w-4 h-4" />
                    </button>
                    <span className="font-medium w-8 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.medicineId, -1)} className="p-1 bg-white rounded shadow-sm hover:bg-gray-100">
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-gray-500">{item.price} ج.م</p>
                    <p className="font-bold text-green-600">{item.total.toFixed(2)} ج.م</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-200 space-y-4">
          <div className="flex justify-between items-center text-xl">
            <span className="font-medium text-gray-600">الإجمالي:</span>
            <span className="font-bold text-gray-900 text-3xl">{total.toFixed(2)} ج.م</span>
          </div>
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
          >
            إتمام البيع
          </button>
        </div>
      </div>

      <div className="flex-1 p-8 flex flex-col gap-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              className="block w-full pl-3 pr-10 py-4 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-green-500 focus:border-green-500 sm:text-lg shadow-sm"
              placeholder="ابحث بالاسم أو امسح الباركود..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            
            {searchResults.length > 0 && (
              <div className="absolute z-20 mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-100 max-h-96 overflow-y-auto">
                <ul className="divide-y divide-gray-100">
                  {searchResults.map(med => (
                    <li 
                      key={med.id}
                      onClick={() => addToCart(med)}
                      className="p-4 hover:bg-green-50 cursor-pointer flex justify-between items-center transition-colors"
                    >
                      <div>
                        <p className="font-bold text-gray-900">{med.name}</p>
                        <p className="text-sm text-gray-500">الباركود: {med.barcode}</p>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-green-600">{med.salePrice} ج.م</p>
                        <p className={`text-sm ${med.quantity > 0 ? 'text-gray-500' : 'text-red-500 font-bold'}`}>
                          المخزون: {med.quantity}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <button
            onClick={() => setIsScanning(!isScanning)}
            className={`px-6 py-4 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm ${
              isScanning ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Camera className="w-6 h-6" />
            {isScanning ? 'إلغاء الكاميرا' : 'مسح بالكاميرا'}
          </button>
        </div>

        {isScanning && (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div id="reader" className="w-full max-w-md mx-auto overflow-hidden rounded-lg"></div>
          </div>
        )}

        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex flex-col items-center justify-center text-gray-400">
          <BarcodeIcon className="w-24 h-24 mb-4 opacity-20" />
          <p className="text-xl">جاهز لمسح الباركود</p>
          <p className="text-sm mt-2">استخدم جهاز الباركود (USB/Bluetooth) أو ابحث يدوياً</p>
        </div>
      </div>

      <div id="invoice-print-area" className="hidden" dir="rtl">
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', width: '80mm', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '5px' }}>صيدليتي</h2>
          <p style={{ textAlign: 'center', fontSize: '12px', margin: '0 0 15px 0' }}>
            التاريخ: {new Date().toLocaleString('ar-EG')}
          </p>
          <hr style={{ borderTop: '1px dashed #000', marginBottom: '15px' }} />
          <table style={{ width: '100%', fontSize: '14px', marginBottom: '15px' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'right' }}>الصنف</th>
                <th style={{ textAlign: 'center' }}>الكمية</th>
                <th style={{ textAlign: 'left' }}>السعر</th>
              </tr>
            </thead>
            <tbody>
              {cart.map(item => (
                <tr key={item.medicineId}>
                  <td style={{ padding: '5px 0' }}>{item.name}</td>
                  <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'left' }}>{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <hr style={{ borderTop: '1px dashed #000', marginBottom: '15px' }} />
          <h3 style={{ textAlign: 'left', margin: '0' }}>الإجمالي: {total.toFixed(2)} ج.م</h3>
          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px' }}>مع تمنياتنا بالشفاء العاجل</p>
        </div>
      </div>
    </div>
  );
}

function ShoppingCartIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}

function BarcodeIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5v14" />
      <path d="M8 5v14" />
      <path d="M12 5v14" />
      <path d="M17 5v14" />
      <path d="M21 5v14" />
    </svg>
  );
}
