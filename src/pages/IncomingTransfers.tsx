import React, { useState, useEffect } from 'react';
import { api, Transfer, Store } from '@/lib/api';
import { Truck, Check, X, AlertTriangle, Eye } from 'lucide-react';
import { useBranch } from '@/contexts/BranchContext';

export default function IncomingTransfers() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const { selectedBranch } = useBranch();

  useEffect(() => {
    fetchData();
  }, [selectedBranch]);

  const fetchData = async () => {
    try {
      const [transfersData, storesData] = await Promise.all([
        api.getTransfers(),
        api.getStores()
      ]);
      setStores(storesData);

      // Filter transfers based on user permissions
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      let filteredTransfers = transfersData;

      if (user && user.role !== 'admin') {
        // Non-admin users can only see transfers to their branch's stores
        const userStores = storesData.filter(store =>
          selectedBranch ? store.branchId === selectedBranch.id : store.branchId === user.branchId
        ).map(store => store.id);

        filteredTransfers = transfersData.filter(transfer =>
          userStores.includes(transfer.toStoreId)
        );
      }

      setTransfers(filteredTransfers);
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  const handleAcceptTransfer = async (transferId: number) => {
    try {
      await api.updateTransfer(transferId, { status: 'received' });
      alert('تم قبول النقل وتحديث المخزون بنجاح');
      fetchData();
    } catch (error: any) {
      alert('حدث خطأ: ' + error.message);
    }
  };

  const handleRejectTransfer = async (transferId: number, notes: string) => {
    try {
      await api.updateTransfer(transferId, { status: 'rejected', notes });
      alert('تم رفض النقل');
      fetchData();
    } catch (error: any) {
      alert('حدث خطأ: ' + error.message);
    }
  };

  const handlePartialAccept = async (transferId: number, updatedItems: any[]) => {
    try {
      // Update the transfer with modified items
      await api.updateTransfer(transferId, {
        status: 'received',
        items: updatedItems
      });
      alert('تم قبول النقل الجزئي وتحديث المخزون');
      fetchData();
    } catch (error: any) {
      alert('حدث خطأ: ' + error.message);
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

  const getBranchName = (storeId: number) => {
    const store = stores.find(s => s.id === storeId);
    if (!store) return 'غير محدد';
    // For simplicity, return store name as branch indicator
    return store.branchId ? 'فرع' : 'مركزي';
  };

  const incomingTransfers = transfers.filter(t => t.status === 'sent');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Truck className="w-8 h-8 text-green-600" />
            إذن النقل الوارد
          </h1>
          <p className="text-gray-600 mt-2">إدارة طلبات النقل الواردة إلى مخازنك</p>
        </div>

        {/* Transfers Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-green-600 text-white">
              <tr>
                <th className="p-4 font-medium">رقم الإذن</th>
                <th className="p-4 font-medium">من مخزن</th>
                <th className="p-4 font-medium">إلى مخزن</th>
                <th className="p-4 font-medium">عدد الأصناف</th>
                <th className="p-4 font-medium">التاريخ</th>
                <th className="p-4 font-medium">أنشئ بواسطة</th>
                <th className="p-4 font-medium text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {incomingTransfers.map((transfer) => (
                <tr key={transfer.id} className="hover:bg-gray-50">
                  <td className="p-4 font-bold text-gray-900">{transfer.id}</td>
                  <td className="p-4 text-gray-700">{getStoreName(transfer.fromStoreId)}</td>
                  <td className="p-4 text-gray-700">{getStoreName(transfer.toStoreId)}</td>
                  <td className="p-4 text-gray-700">{transfer.items.length}</td>
                  <td className="p-4 text-gray-700">{new Date(transfer.createdAt).toLocaleDateString('ar-EG')}</td>
                  <td className="p-4 text-gray-700">{transfer.createdBy}</td>
                  <td className="p-4 flex justify-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedTransfer(transfer);
                        setShowDetailsModal(true);
                      }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                      title="عرض التفاصيل"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleAcceptTransfer(transfer.id!)}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                      title="قبول النقل"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRejectTransfer(transfer.id!, 'مرفوض من المستلم')}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                      title="رفض النقل"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {incomingTransfers.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    لا توجد طلبات نقل واردة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Transfer Details Modal */}
        {showDetailsModal && selectedTransfer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50">
                <h2 className="text-xl font-bold text-gray-800">تفاصيل إذن النقل #{selectedTransfer.id}</h2>
                <button onClick={() => setShowDetailsModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                {/* Transfer Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-500">من مخزن</p>
                    <p className="font-medium">{getStoreName(selectedTransfer.fromStoreId)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">إلى مخزن</p>
                    <p className="font-medium">{getStoreName(selectedTransfer.toStoreId)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">التاريخ</p>
                    <p className="font-medium">{new Date(selectedTransfer.createdAt).toLocaleString('ar-EG')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">أنشئ بواسطة</p>
                    <p className="font-medium">{selectedTransfer.createdBy}</p>
                  </div>
                </div>

                {selectedTransfer.notes && (
                  <div className="mb-6">
                    <p className="text-sm text-gray-500">ملاحظات</p>
                    <p className="font-medium bg-gray-50 p-3 rounded">{selectedTransfer.notes}</p>
                  </div>
                )}

                {/* Items Table */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-4 text-right font-medium text-gray-700">الصنف</th>
                        <th className="p-4 text-right font-medium text-gray-700">الباركود</th>
                        <th className="p-4 text-right font-medium text-gray-700">الكمية المطلوبة</th>
                        <th className="p-4 text-right font-medium text-gray-700">تاريخ الصلاحية</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedTransfer.items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="p-4 font-medium text-gray-900">{item.name}</td>
                          <td className="p-4 text-gray-700">{item.barcode}</td>
                          <td className="p-4 text-gray-700">{item.quantity}</td>
                          <td className="p-4 text-gray-700">{item.expiryDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleRejectTransfer(selectedTransfer.id!, 'مرفوض من المستلم')}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    رفض النقل
                  </button>
                  <button
                    onClick={() => handleAcceptTransfer(selectedTransfer.id!)}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    تأكيد الاستلام
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}