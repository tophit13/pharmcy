import React, { useState, useEffect } from 'react';
import { api, Store, Medicine, Transfer, TransferItem } from '@/lib/api';
import { Truck, Plus, Search, Package, Calendar, AlertTriangle, Printer, Check, X } from 'lucide-react';
import { useBranch } from '@/contexts/BranchContext';

export default function StockTransfer() {
  const [stores, setStores] = useState<Store[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [formData, setFormData] = useState({
    fromStoreId: '',
    toStoreId: '',
    notes: ''
  });
  const { selectedBranch } = useBranch();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [storesData, medicinesData, transfersData] = await Promise.all([
        api.getStores(),
        api.getMedicines(),
        api.getTransfers()
      ]);
      setStores(storesData);
      setMedicines(medicinesData);
      setTransfers(transfersData);
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  const handleAddItem = () => {
    if (!selectedMedicine) return;

    const existingItem = transferItems.find(item => item.medicineId === selectedMedicine.id);
    if (existingItem) {
      alert('هذا الصنف موجود بالفعل في قائمة النقل');
      return;
    }

    const newItem: TransferItem = {
      medicineId: selectedMedicine.id,
      barcode: selectedMedicine.barcode,
      name: selectedMedicine.name,
      quantity: 1,
      expiryDate: selectedMedicine.expiryDate
    };

    setTransferItems([...transferItems, newItem]);
    setSelectedMedicine(null);
    setSearchTerm('');
  };

  const handleRemoveItem = (index: number) => {
    setTransferItems(transferItems.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const updatedItems = [...transferItems];
    updatedItems[index].quantity = quantity;
    setTransferItems(updatedItems);
  };

  const handleExpiryChange = (index: number, expiryDate: string) => {
    const updatedItems = [...transferItems];
    updatedItems[index].expiryDate = expiryDate;
    setTransferItems(updatedItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fromStoreId || !formData.toStoreId || transferItems.length === 0) {
      alert('يرجى ملء جميع البيانات المطلوبة');
      return;
    }

    try {
      await api.addTransfer({
        fromStoreId: parseInt(formData.fromStoreId),
        toStoreId: parseInt(formData.toStoreId),
        items: transferItems,
        status: 'pending',
        notes: formData.notes
      });
      alert('تم إنشاء إذن النقل بنجاح');
      fetchData();
      setIsModalOpen(false);
      setTransferItems([]);
      setFormData({ fromStoreId: '', toStoreId: '', notes: '' });
    } catch (error: any) {
      alert('حدث خطأ: ' + error.message);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await api.updateTransfer(id, { status });
      alert('تم تحديث حالة النقل بنجاح');
      fetchData();
    } catch (error: any) {
      alert('حدث خطأ: ' + error.message);
    }
  };

  const handlePrint = (transfer: Transfer) => {
    // Simple print functionality - in real app, use jsPDF or similar
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>إذن نقل مخزون</title>
            <style>
              body { font-family: Arial, sans-serif; direction: rtl; }
              .header { text-align: center; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>إذن نقل مخزون</h1>
              <p>رقم الإذن: ${transfer.id}</p>
              <p>التاريخ: ${new Date(transfer.createdAt).toLocaleDateString('ar-EG')}</p>
            </div>
            <p><strong>من مخزن:</strong> ${stores.find(s => s.id === transfer.fromStoreId)?.name}</p>
            <p><strong>إلى مخزن:</strong> ${stores.find(s => s.id === transfer.toStoreId)?.name}</p>
            <p><strong>الحالة:</strong> ${transfer.status}</p>
            <p><strong>أنشئ بواسطة:</strong> ${transfer.createdBy}</p>
            ${transfer.notes ? `<p><strong>ملاحظات:</strong> ${transfer.notes}</p>` : ''}
            <table>
              <thead>
                <tr>
                  <th>الصنف</th>
                  <th>الباركود</th>
                  <th>الكمية</th>
                  <th>تاريخ الصلاحية</th>
                </tr>
              </thead>
              <tbody>
                ${transfer.items.map(item => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.barcode}</td>
                    <td>${item.quantity}</td>
                    <td>${item.expiryDate}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'received': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'معلق';
      case 'sent': return 'مرسل';
      case 'received': return 'مستلم';
      case 'rejected': return 'مرفوض';
      default: return status;
    }
  };

  const getStoreName = (storeId: number) => {
    const store = stores.find(s => s.id === storeId);
    return store ? store.name : 'غير محدد';
  };

  const filteredMedicines = medicines.filter(med =>
    med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.barcode.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Truck className="w-8 h-8 text-blue-600" />
            نقل المخزون
          </h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            إذن نقل جديد
          </button>
        </div>

        {/* Transfers Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="p-4 font-medium">رقم الإذن</th>
                <th className="p-4 font-medium">من مخزن</th>
                <th className="p-4 font-medium">إلى مخزن</th>
                <th className="p-4 font-medium">عدد الأصناف</th>
                <th className="p-4 font-medium">الحالة</th>
                <th className="p-4 font-medium">التاريخ</th>
                <th className="p-4 font-medium text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transfers.map((transfer) => (
                <tr key={transfer.id} className="hover:bg-gray-50">
                  <td className="p-4 font-bold text-gray-900">{transfer.id}</td>
                  <td className="p-4 text-gray-700">{getStoreName(transfer.fromStoreId)}</td>
                  <td className="p-4 text-gray-700">{getStoreName(transfer.toStoreId)}</td>
                  <td className="p-4 text-gray-700">{transfer.items.length}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(transfer.status)}`}>
                      {getStatusText(transfer.status)}
                    </span>
                  </td>
                  <td className="p-4 text-gray-700">{new Date(transfer.createdAt).toLocaleDateString('ar-EG')}</td>
                  <td className="p-4 flex justify-center gap-2">
                    <button
                      onClick={() => handlePrint(transfer)}
                      className="p-1.5 text-gray-600 hover:bg-gray-50 rounded"
                      title="طباعة"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    {transfer.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(transfer.id!, 'sent')}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="إرسال"
                        >
                          <Package className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleStatusChange(transfer.id!, 'rejected')}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="رفض"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {transfers.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    لا توجد طلبات نقل
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Create Transfer Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50">
                <h2 className="text-xl font-bold text-gray-800">إذن نقل مخزون جديد</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Store Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">المخزن المصدر</label>
                    <select
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={formData.fromStoreId}
                      onChange={(e) => setFormData({...formData, fromStoreId: e.target.value})}
                      required
                    >
                      <option value="">اختر المخزن المصدر</option>
                      {stores.map(store => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">المخزن المستهدف</label>
                    <select
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={formData.toStoreId}
                      onChange={(e) => setFormData({...formData, toStoreId: e.target.value})}
                      required
                    >
                      <option value="">اختر المخزن المستهدف</option>
                      {stores.filter(store => store.id !== parseInt(formData.fromStoreId)).map(store => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Add Items */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">إضافة الأصناف</h3>

                  <div className="flex gap-2 mb-4">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="ابحث بالاسم أو الباركود..."
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      {searchTerm && (
                        <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-b shadow-lg max-h-40 overflow-y-auto">
                          {filteredMedicines.slice(0, 5).map(med => (
                            <div
                              key={med.id}
                              className="p-2 hover:bg-gray-100 cursor-pointer"
                              onClick={() => {
                                setSelectedMedicine(med);
                                setSearchTerm(med.name);
                              }}
                            >
                              <div className="font-medium">{med.name}</div>
                              <div className="text-sm text-gray-500">{med.barcode} - متوفر: {med.quantity}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      disabled={!selectedMedicine}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                    >
                      إضافة
                    </button>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2">
                    {transferItems.map((item, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded">
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-gray-500">{item.barcode}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm">الكمية:</label>
                          <input
                            type="number"
                            min="1"
                            className="w-20 p-1 border border-gray-300 rounded text-center"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(index, parseInt(e.target.value))}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm">تاريخ الصلاحية:</label>
                          <input
                            type="date"
                            className="p-1 border border-gray-300 rounded"
                            value={item.expiryDate}
                            onChange={(e) => handleExpiryChange(index, e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات</label>
                  <textarea
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="أي ملاحظات إضافية..."
                  />
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    إنشاء إذن النقل
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}