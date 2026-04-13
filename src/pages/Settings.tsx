import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Download, Upload, Database, Network, Power } from 'lucide-react';

export default function Settings() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<{ip: string, port: number} | null>(null);
  const [autoStart, setAutoStart] = useState(false);

  useEffect(() => {
    api.getNetworkInfo().then(setNetworkInfo).catch(console.error);
    
    // Check auto-start status if running in Electron
    if (window.electronAPI) {
      window.electronAPI.getAutoStartStatus().then(setAutoStart);
    }
  }, []);

  const handleToggleAutoStart = async () => {
    if (window.electronAPI) {
      const newState = !autoStart;
      await window.electronAPI.toggleAutoStart(newState);
      setAutoStart(newState);
    } else {
      alert('هذه الميزة متاحة فقط في تطبيق سطح المكتب (Windows)');
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pharmacy_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed', error);
      alert('فشل تصدير البيانات');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('تحذير: استيراد البيانات سيؤدي إلى مسح البيانات الحالية. هل أنت متأكد؟')) {
      e.target.value = '';
      return;
    }

    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      await api.importData(data);

      alert('تم استيراد البيانات بنجاح');
      window.location.reload();
    } catch (error) {
      console.error('Import failed', error);
      alert('فشل استيراد البيانات. تأكد من صحة الملف.');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">الإعدادات</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
            <Database className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">النسخ الاحتياطي والبيانات</h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <h3 className="font-bold text-gray-900">تصدير البيانات</h3>
                <p className="text-sm text-gray-500 mt-1">حفظ نسخة احتياطية من جميع بيانات الصيدلية في ملف JSON</p>
              </div>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Download className="w-5 h-5" />
                {isExporting ? 'جاري التصدير...' : 'تصدير'}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
              <div>
                <h3 className="font-bold text-red-900">استيراد البيانات</h3>
                <p className="text-sm text-red-700 mt-1">استعادة البيانات من ملف JSON (سيمسح البيانات الحالية)</p>
              </div>
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  disabled={isImporting}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <button
                  disabled={isImporting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 pointer-events-none"
                >
                  <Upload className="w-5 h-5" />
                  {isImporting ? 'جاري الاستيراد...' : 'استيراد'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
            <Network className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">الشبكة المحلية</h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-bold text-green-900 mb-2">الوصول من أجهزة أخرى</h3>
              <p className="text-sm text-green-800 mb-4">
                يمكنك فتح هذا التطبيق من أي جهاز آخر (كمبيوتر أو موبايل) متصل بنفس شبكة الـ Wi-Fi عن طريق إدخال الرابط التالي في المتصفح:
              </p>
              
              <div className="bg-white p-4 rounded border border-green-200 text-center">
                {networkInfo ? (
                  <a 
                    href={`http://${networkInfo.ip}:${networkInfo.port}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-2xl font-mono font-bold text-green-700 hover:underline"
                  >
                    http://{networkInfo.ip}:{networkInfo.port}
                  </a>
                ) : (
                  <span className="text-gray-500">جاري جلب عنوان الشبكة...</span>
                )}
              </div>
              <p className="text-xs text-green-700 mt-4 text-center">
                ملاحظة: تأكد من أن جدار الحماية (Firewall) يسمح بالاتصال على هذا المنفذ.
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
            <Power className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">إعدادات النظام</h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div>
                <h3 className="font-bold text-purple-900">التشغيل التلقائي</h3>
                <p className="text-sm text-purple-800 mt-1">تشغيل التطبيق تلقائياً عند بدء تشغيل ويندوز</p>
              </div>
              <button
                onClick={handleToggleAutoStart}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                  autoStart ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoStart ? '-translate-x-6' : '-translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
