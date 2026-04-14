export type Role = 'admin' | 'pharmacist' | 'cashier';

export const ROLE_NAMES: Record<Role, string> = {
  admin: 'مدير نظام',
  pharmacist: 'صيدلي',
  cashier: 'كاشير'
};

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: ['*'],
  pharmacist: [
    '/',
    '/inventory',
    '/inventory/add',
    '/pos',
    '/pos/return',
    '/customers',
    '/barcode',
    '/about',
    '/ai',
    '/pharmacy-info'
  ],
  cashier: [
    '/',
    '/pos',
    '/pos/return',
    '/barcode',
    '/about'
  ]
};

export const hasPermission = (role: string | undefined, path: string): boolean => {
  if (!role) return false;
  if (role === 'admin') return true;
  
  const allowedPaths = ROLE_PERMISSIONS[role as Role] || [];
  if (allowedPaths.includes('*')) return true;
  
  return allowedPaths.includes(path);
};
