import { useEffect, useRef } from 'react';

interface BarcodeScannerOptions {
  onScan: (barcode: string) => void;
  minLength?: number;
  timeout?: number;
}

export function useBarcodeScanner({ onScan, minLength = 6, timeout = 100 }: BarcodeScannerOptions) {
  const buffer = useRef('');
  const lastKeyTime = useRef(Date.now());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input field (unless we specifically want to capture it globally, 
      // but usually we don't want to intercept normal typing)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        // If it's the barcode input itself, we might want to let it handle its own onKeyDown
        // But the prompt says "Most USB/Bluetooth pharmacy barcode scanners work as HID... Implement a global barcode listener"
        // If we want it truly global, we might need to be careful.
        // Let's just capture it if it's fast enough.
      }

      const now = Date.now();
      
      if (now - lastKeyTime.current > timeout) {
        buffer.current = '';
      }
      lastKeyTime.current = now;

      if (e.key === 'Enter') {
        if (buffer.current.length >= minLength) {
          onScan(buffer.current);
          buffer.current = '';
        }
        return;
      }

      if (e.key.length === 1) {
        buffer.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan, minLength, timeout]);
}
