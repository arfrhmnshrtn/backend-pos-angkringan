export const JWT_CONSTANTS = {
  ACCESS_TOKEN_STRATEGY: 'jwt',
  REFRESH_TOKEN_STRATEGY: 'jwt-refresh',
} as const;

export const BCRYPT_SALT_ROUNDS = 10;

export const DEFAULT_OWNER_PIN = '1234';

export const PERMISSIONS = {
  DASHBOARD_READ: 'dashboard.read',
  PRODUCT_READ: 'product.read',
  PRODUCT_CREATE: 'product.create',
  PRODUCT_UPDATE: 'product.update',
  PRODUCT_DELETE: 'product.delete',
  CATEGORY_READ: 'category.read',
  CATEGORY_CREATE: 'category.create',
  CATEGORY_UPDATE: 'category.update',
  CATEGORY_DELETE: 'category.delete',
  TRANSACTION_READ: 'transaction.read',
  TRANSACTION_CREATE: 'transaction.create',
  TRANSACTION_UPDATE: 'transaction.update',
  TRANSACTION_VOID: 'transaction.void',
  TRANSACTION_REFUND: 'transaction.refund',
  CUSTOMER_READ: 'customer.read',
  CUSTOMER_CREATE: 'customer.create',
  CUSTOMER_UPDATE: 'customer.update',
  CUSTOMER_DELETE: 'customer.delete',
  REPORT_READ: 'report.read',
  SETTING_READ: 'setting.read',
  SETTING_UPDATE: 'setting.update',
  CASHIER_READ: 'cashier.read',
  CASHIER_CREATE: 'cashier.create',
  CASHIER_UPDATE: 'cashier.update',
  CASHIER_DELETE: 'cashier.delete',
  ROLE_READ: 'role.read',
  ROLE_UPDATE: 'role.update',
  DEBT_READ: 'debt.read',
  DEBT_CREATE: 'debt.create',
  DEBT_UPDATE: 'debt.update',
  DEBT_CANCEL: 'debt.cancel',
  DEBT_PAYMENT: 'debt.payment',
  DEBT_DELETE: 'debt.delete',
} as const;

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const KASIR_PERMISSIONS = [
  PERMISSIONS.DASHBOARD_READ,
  PERMISSIONS.TRANSACTION_READ,
  PERMISSIONS.TRANSACTION_CREATE,
  PERMISSIONS.PRODUCT_READ,
  PERMISSIONS.CUSTOMER_READ,
] as const;
