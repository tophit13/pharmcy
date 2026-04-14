import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { hasPermission } from '@/lib/rbac';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPermission(user.role, location.pathname)) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="bg-red-50 text-red-600 p-6 rounded-lg shadow-sm border border-red-200 max-w-md">
          <h2 className="text-2xl font-bold mb-2">عذراً، لا تملك صلاحية</h2>
          <p className="text-red-700">
            ليس لديك الصلاحية الكافية للوصول إلى هذه الصفحة. يرجى مراجعة مدير النظام.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
