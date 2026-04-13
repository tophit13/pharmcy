import React, { useState, useEffect } from 'react';
import { api, Customer } from '@/lib/api';
import { Plus, Search, Edit, Trash2, X } from 'lucide-react';

export default function Customers() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);

  const loadCustomers = async () => {
    const data = await api.getCustomers();
    setCustomers(data);
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (search) {
      setFilteredCustomers(
        customers.filter(c => 
          c.name.toLowerCase().includes(search.toLowerCase()) || 
          c.phone.includes(search)
        )
      );
    } else {
      setFilteredCustomers(customers);
    }
  }, [search, customers]);

  const handleDelete = async (id: number) => {
    if (window.confirm('هل أنت متأكد من حذف هذا العميل؟')) {
      await api.deleteCustomer(id);
      loadCustomers();
    }
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">قائمة العملاء</h1>
        <button
          onClick={openAddModal}
          className="bg-[#2E7D32] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          إضافة عميل جديد
        </button>
      </div>

      <div className="bg-white p-3 rounded shadow-sm border border-gray-200 flex items-center gap-3">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="ابحث بالاسم أو رقم الهاتف..."
          className="flex-1 outline-none text-gray-700"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-[#2E7D32] text-white">
            <tr>
              <th className="p-3 font-medium">م</th>
              <th className="p-3 font-medium">اسم العميل</th>
              <th className="p-3 font-medium">رقم الهاتف</th>
              <th className="p-3 font-medium">الرصيد (عليه)</th>
              <th className="p-3 font-medium">ملاحظات</th>
              <th className="p-3 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredCustomers.map((customer, idx) => (
              <tr key={customer.id} className="hover:bg-gray-50">
                <td className="p-3 text-gray-700">{idx + 1}</td>
                <td className="p-3 font-bold text-gray-900">{customer.name}</td>
                <td className="p-3 text-gray-700">{customer.phone}</td>
                <td className="p-3 font-bold text-red-600">{customer.balance?.toFixed(2) || '0.00'}</td>
                <td className="p-3 text-gray-700">{customer.notes}</td>
                <td className="p-3 flex items-center gap-2">
                  <button onClick={() => openEditModal(customer)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => customer.id && handleDelete(customer.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredCustomers.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  لا يوجد عملاء مطابقين للبحث
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <CustomerModal 
          customer={editingCustomer} 
          onClose={() => setIsModalOpen(false)} 
          onSave={loadCustomers}
        />
      )}
    </div>
  );
}

function CustomerModal({ customer, onClose, onSave }: { customer: Customer | null, onClose: () => void, onSave: () => void }) {
  const [formData, setFormData] = useState<Partial<Customer>>(
    customer || {
      name: '',
      phone: '',
      notes: '',
      balance: 0
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (customer?.id) {
      await api.updateCustomer(customer.id, formData as Customer);
    } else {
      await api.addCustomer(formData as Customer);
    }
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900">
            {customer ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم العميل</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
            <input
              type="text"
              required
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الرصيد الافتتاحي (عليه)</label>
            <input
              type="number"
              step="0.01"
              value={formData.balance === 0 ? '' : formData.balance}
              onChange={e => setFormData({...formData, balance: e.target.value ? parseFloat(e.target.value) : 0})}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-[#2E7D32] focus:border-[#2E7D32] outline-none"
              rows={3}
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
