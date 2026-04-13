import React from 'react';
import { Info, Shield, Monitor, Database, Code } from 'lucide-react';

export default function About() {
  return (
    <div className="p-4 space-y-4">
      <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <Info className="w-6 h-6 text-blue-600" />
          عن البرنامج
        </h1>
      </div>

      <div className="bg-white p-8 rounded shadow-sm border border-gray-200 max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Monitor className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">نظام إدارة الصيدليات</h2>
          <p className="text-gray-600">الإصدار 1.0.0</p>
        </div>

        <div className="space-y-6">
          <div className="border-b pb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-green-600" />
              مميزات النظام
            </h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1 pr-4">
              <li>إدارة كاملة للمخزون والأصناف</li>
              <li>نقاط بيع (POS) سريعة وفعالة</li>
              <li>إدارة المشتريات والموردين</li>
              <li>إدارة العملاء والديون</li>
              <li>تقارير شاملة للمبيعات وحركة الأصناف</li>
              <li>دعم كامل للباركود</li>
              <li>نظام صلاحيات للمستخدمين</li>
            </ul>
          </div>

          <div className="border-b pb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-2">
              <Database className="w-5 h-5 text-orange-600" />
              التقنيات المستخدمة
            </h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1 pr-4">
              <li>React & TypeScript للواجهة الأمامية</li>
              <li>Electron لتطبيق سطح المكتب</li>
              <li>SQLite لقاعدة البيانات المحلية</li>
              <li>Tailwind CSS للتصميم</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-2">
              <Code className="w-5 h-5 text-purple-600" />
              فريق التطوير
            </h3>
            <p className="text-gray-600 pr-4">
              تم تطوير هذا النظام ليكون الحل الأمثل لإدارة الصيدليات بكفاءة وسهولة.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t text-center text-sm text-gray-500">
          <p>جميع الحقوق محفوظة &copy; {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
}
