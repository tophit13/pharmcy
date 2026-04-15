import React from 'react';
import { Minus, Square, X } from 'lucide-react';

export default function TitleBar() {
  // Check if we are running in Electron
  const isElectron = (window as any).electronAPI !== undefined;

  if (!isElectron) {
    return null; // Don't render the custom title bar in a normal browser
  }

  const handleMinimize = () => {
    (window as any).electronAPI.minimize();
  };

  const handleMaximize = () => {
    (window as any).electronAPI.maximize();
  };

  const handleClose = () => {
    (window as any).electronAPI.close();
  };

  return (
    <div 
      className="h-8 bg-[#1a1a1a] flex justify-between items-center select-none z-50 relative"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      <div className="text-white text-xs font-bold px-4 flex items-center gap-2">
        <span>💊</span> نظام إدارة الصيدلية
      </div>
      <div className="flex h-full" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button 
          onClick={handleMinimize} 
          className="h-full px-4 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors flex items-center justify-center"
          title="تصغير"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button 
          onClick={handleMaximize} 
          className="h-full px-4 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors flex items-center justify-center"
          title="تكبير"
        >
          <Square className="w-3 h-3" />
        </button>
        <button 
          onClick={handleClose} 
          className="h-full px-4 text-gray-400 hover:bg-red-600 hover:text-white transition-colors flex items-center justify-center"
          title="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
