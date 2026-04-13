import React, { useState, useEffect } from 'react';
import { api, User } from '@/lib/api';
import { Users as UsersIcon, Plus, Edit, Trash2, Save, X } from 'lucide-react';

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'cashier'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    }
  };

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        password: '', // Don't show existing password
        role: user.role
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        role: 'cashier'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        if (!editingUser.id) return;
        await api.updateUser(editingUser.id, formData);
        alert('تم تحديث بيانات المستخدم بنجاح');
      } else {
        if (!formData.password) {
          alert('كلمة المرور مطلوبة للمستخدم الجديد');
          return;
        }
        await api.addUser(formData);
        alert('تمت إضافة المستخدم بنجاح');
      }
      fetchUsers();
      handleCloseModal();
    } catch (error: any) {
      console.error('Failed to save user', error);
      alert('حدث خطأ أثناء حفظ بيانات المستخدم: ' + (error.message || ''));
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
      try {
        await api.deleteUser(id);
        alert('تم حذف المستخدم بنجاح');
        fetchUsers();
      } catch (error) {
        console.error('Failed to delete user', error);
        alert('حدث خطأ أثناء حذف المستخدم');
      }
    }
  };

  const roleMap: Record<string, string> = {
    'admin': 'مدير نظام',
    'pharmacist': 'صيدلي',
    'cashier': 'كاشير'
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <UsersIcon className="w-6 h-6 text-blue-600" />
          بيانات المستخدمين
        </h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-[#2E7D32] text-white rounded hover:bg-green-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          إضافة مستخدم
        </button>
      </div>

      <div className="bg-white rounded shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-[#2E7D32] text-white">
            <tr>
              <th className="p-3 font-medium">اسم المستخدم</th>
              <th className="p-3 font-medium">الصلاحية</th>
              <th className="p-3 font-medium text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="p-3 font-bold text-gray-900">{user.username}</td>
                <td className="p-3 text-gray-700">{roleMap[user.role] || user.role}</td>
                <td className="p-3 flex justify-center gap-2">
                  <button
                    onClick={() => handleOpenModal(user)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                    title="تعديل"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => user.id && handleDelete(user.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    title="حذف"
                    disabled={user.username === 'admin'} // Prevent deleting main admin
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={3} className="p-8 text-center text-gray-500">
                  لا يوجد مستخدمين
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">
                {editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  disabled={editingUser?.username === 'admin'}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  كلمة المرور {editingUser && <span className="text-xs text-gray-500">(اتركها فارغة إذا لم ترد تغييرها)</span>}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الصلاحية</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  disabled={editingUser?.username === 'admin'}
                >
                  <option value="cashier">كاشير</option>
                  <option value="pharmacist">صيدلي</option>
                  <option value="admin">مدير نظام</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
