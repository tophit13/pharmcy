import React, { useState, useRef } from 'react';
import { Printer, Barcode as BarcodeIcon } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import JsBarcode from 'jsbarcode';

export default function BarcodePrint() {
  const [barcodeValue, setBarcodeValue] = useState('');
  const [barcodeName, setBarcodeName] = useState('');
  const [barcodePrice, setBarcodePrice] = useState('');
  const [quantity, setQuantity] = useState(1);
  const printRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const generateBarcode = () => {
    if (canvasRef.current && barcodeValue) {
      try {
        JsBarcode(canvasRef.current, barcodeValue, {
          format: "CODE128",
          width: 2,
          height: 50,
          displayValue: true,
          fontSize: 14,
          margin: 0
        });
      } catch (e) {
        console.error("Invalid barcode format", e);
        alert("تنسيق الباركود غير صالح");
      }
    }
  };

  // Generate barcode whenever value changes
  React.useEffect(() => {
    if (barcodeValue) {
      generateBarcode();
    }
  }, [barcodeValue]);

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <BarcodeIcon className="w-6 h-6 text-blue-600" />
          طباعة باركود
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Input Form */}
        <div className="bg-white p-4 rounded shadow-sm border border-gray-200 space-y-4">
          <h2 className="text-lg font-bold text-gray-800 border-b pb-2">بيانات الباركود</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رقم الباركود</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              value={barcodeValue}
              onChange={(e) => setBarcodeValue(e.target.value)}
              placeholder="أدخل رقم الباركود..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم الصنف (اختياري)</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              value={barcodeName}
              onChange={(e) => setBarcodeName(e.target.value)}
              placeholder="اسم الصنف ليظهر على الملصق"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">السعر (اختياري)</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              value={barcodePrice}
              onChange={(e) => setBarcodePrice(e.target.value)}
              placeholder="السعر ليظهر على الملصق"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">العدد المطلوب طباعته</label>
            <input
              type="number"
              min="1"
              max="100"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            />
          </div>

          <button 
            disabled={!barcodeValue}
            onClick={() => handlePrint()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Printer className="w-5 h-5" />
            طباعة الباركود
          </button>
        </div>

        {/* Preview */}
        <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">معاينة</h2>
          
          <div className="flex justify-center items-center p-8 bg-gray-50 border border-dashed border-gray-300 rounded min-h-[200px]">
            {barcodeValue ? (
              <div className="bg-white p-2 border border-gray-200 inline-block text-center">
                {barcodeName && <div className="text-xs font-bold mb-1 truncate max-w-[150px]">{barcodeName}</div>}
                <canvas ref={canvasRef}></canvas>
                {barcodePrice && <div className="text-sm font-bold mt-1">{barcodePrice} ج.م</div>}
              </div>
            ) : (
              <p className="text-gray-400">أدخل رقم الباركود للمعاينة</p>
            )}
          </div>
        </div>
      </div>

      {/* Hidden Print Area */}
      <div className="hidden">
        <div ref={printRef} className="p-4 flex flex-wrap gap-4 justify-start">
          {Array.from({ length: quantity }).map((_, i) => (
            <div key={i} className="inline-block text-center p-2 border border-gray-300" style={{ width: '4cm', height: '2.5cm', overflow: 'hidden' }}>
              {barcodeName && <div className="text-[10px] font-bold mb-1 truncate" style={{ maxWidth: '100%' }}>{barcodeName}</div>}
              <img src={canvasRef.current?.toDataURL()} alt="barcode" style={{ maxWidth: '100%', height: 'auto', maxHeight: '1.2cm' }} />
              {barcodePrice && <div className="text-[12px] font-bold mt-1">{barcodePrice} ج.م</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
