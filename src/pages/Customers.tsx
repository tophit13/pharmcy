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
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">إدارة العملاء</h1>
        <button
          onClick={openAddModal}
          className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          إضافة عميل جديد
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="ابحث بالاسم أو رقم الهاتف..."
          className="flex-1 outline-none text-gray-700"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-4 font-medium text-gray-600">الاسم</th>
              <th className="p-4 font-medium text-gray-600">رقم الهاتف</th>
              <th className="p-4 font-medium text-gray-600">ملاحظات (وصفات طبية)</th>
              <th className="p-4 font-medium text-gray-600">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredCustomers.map((customer) => (
              <tr key={customer.id} className="hover:bg-gray-50">
                <td className="p-4 font-medium text-gray-900">{customer.name}</td>
                <td className="p-4 text-gray-600">{customer.phone}</td>
                <td className="p-4 text-gray-600 max-w-md truncate">{customer.notes}</td>
                <td className="p-4 flex items-center gap-2">
                  <button onClick={() => openEditModal(customer)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => customer.id && handleDelete(customer.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredCustomers.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
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
      notes: ''
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900">
            {customer ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
            <input
              type="text"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات (الأمراض المزمنة، الوصفات...)</label>
            <textarea
              rows={4}
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            ></textarea>
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              حفظ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
