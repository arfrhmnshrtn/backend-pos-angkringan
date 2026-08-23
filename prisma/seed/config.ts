/**
 * Seed Configuration
 * All configurable values for the dummy data generator.
 * Override via environment variables.
 */

// --- Core Config ---
export const SEED_CONFIG = {
  /** Total number of orders to generate */
  ORDERS: parseInt(process.env.SEED_ORDERS || '100000', 10),

  /** Date range for transactional data (WIB dates, YYYY-MM-DD) */
  START_DATE: process.env.SEED_START_DATE || '2025-08-01',
  END_DATE: process.env.SEED_END_DATE || '2026-08-30',

  /** Deterministic random seed for reproducibility */
  RANDOM_SEED: parseInt(process.env.SEED_RANDOM || '12345', 10),

  /** Batch size for bulk inserts */
  BATCH_SIZE: parseInt(process.env.SEED_BATCH_SIZE || '2000', 10),

  /** Number of expense records to generate */
  EXPENSES: parseInt(process.env.SEED_EXPENSES || '2500', 10),

  /** Number of waste records to generate */
  WASTES: parseInt(process.env.SEED_WASTES || '1500', 10),
} as const;

// --- Day-of-week weights (Mon=0 .. Sun=6) ---
export const DAY_WEIGHTS: readonly number[] = [
  0.70,  // Monday: lower
  0.85,  // Tuesday: normal-ish
  0.90,  // Wednesday: normal
  0.90,  // Thursday: normal
  1.20,  // Friday: higher
  1.35,  // Saturday: peak
  1.10,  // Sunday: moderately high
];

// --- Monthly multipliers (index 0 = month 1 i.e. Jan) ---
// Ramadan 2026 is roughly Feb 18 – Mar 19, Eid al-Fitr ~ Mar 20
export const MONTH_MULTIPLIERS: readonly number[] = [
  0.95,  // Jan
  0.85,  // Feb (Ramadan starts late Feb 2026 - sales dip daytime angkringan)
  0.80,  // Mar (Ramadan continues + Eid week can be slow)
  1.00,  // Apr (post-Eid recovery)
  1.00,  // May
  0.95,  // Jun
  1.00,  // Jul
  1.05,  // Aug (independence day area + more gatherings)
  0.95,  // Sep
  1.00,  // Oct
  1.00,  // Nov
  1.15,  // Dec (year-end celebrations, more hangouts)
];

// --- Hour distribution weights (hour 0-23) ---
// Angkringan typically operates afternoon–late night
export const HOUR_WEIGHTS: readonly number[] = [
  0.15, // 00
  0.08, // 01
  0.02, // 02
  0.00, // 03
  0.00, // 04
  0.00, // 05
  0.00, // 06
  0.00, // 07
  0.00, // 08
  0.00, // 09
  0.00, // 10
  0.00, // 11
  0.00, // 12
  0.00, // 13
  0.02, // 14
  0.05, // 15
  0.30, // 16
  0.50, // 17
  0.80, // 18
  1.00, // 19
  1.00, // 20
  0.90, // 21
  0.70, // 22
  0.40, // 23
];

// --- Order status distribution ---
export const ORDER_STATUS_WEIGHTS = {
  lunas: 0.88,
  hutang: 0.08,
  belum_bayar: 0.04,
} as const;

// --- Payment method distribution (for lunas orders) ---
export const PAYMENT_METHOD_WEIGHTS = {
  tunai: 0.55,
  qris: 0.35,
  transfer: 0.10,
} as const;

// --- Items per order distribution ---
export const ITEMS_PER_ORDER_WEIGHTS: ReadonlyArray<{ count: number; weight: number }> = [
  { count: 1, weight: 0.20 },
  { count: 2, weight: 0.30 },
  { count: 3, weight: 0.25 },
  { count: 4, weight: 0.15 },
  { count: 5, weight: 0.07 },
  { count: 6, weight: 0.02 },
  { count: 7, weight: 0.01 },
];

// --- Quantity per item distribution ---
export const QUANTITY_WEIGHTS: ReadonlyArray<{ qty: number; weight: number }> = [
  { qty: 1, weight: 0.40 },
  { qty: 2, weight: 0.30 },
  { qty: 3, weight: 0.15 },
  { qty: 4, weight: 0.07 },
  { qty: 5, weight: 0.04 },
  { qty: 6, weight: 0.02 },
  { qty: 8, weight: 0.01 },
  { qty: 10, weight: 0.01 },
];

// --- Customer names ---
export const CUSTOMER_NAMES: readonly string[] = [
  'Andi', 'Budi', 'Candra', 'Dimas', 'Eko', 'Fajar', 'Galih', 'Hendra',
  'Irfan', 'Joko', 'Kiki', 'Lukman', 'Maman', 'Nanda', 'Oki', 'Pras',
  'Rendi', 'Sandi', 'Tomi', 'Udin', 'Vino', 'Wahyu', 'Yanto', 'Zaki',
  'Ayu', 'Bella', 'Citra', 'Dewi', 'Evi', 'Fitri', 'Gita', 'Hani',
  'Intan', 'Julia', 'Kartika', 'Lina', 'Mega', 'Nisa', 'Putri', 'Rina',
  'Sari', 'Tika', 'Umi', 'Vira', 'Wulan', 'Yuni', 'Zahra', 'Dina',
  'Pak Bambang', 'Mas Agus', 'Bu Siti', 'Pak Harto', 'Mas Rizky',
  'Kang Asep', 'Mbak Ani', 'Pak Surya', 'Bu Endang', 'Mas Bayu',
  'Pak Jokowi', 'Bu Ratna', 'Mas Ferry', 'Kang Dadang', 'Mbak Retno',
  'Pak Sugeng', 'Bu Yayuk', 'Mas Gilang', 'Pak Suryadi', 'Bu Mulyani',
];

// --- Debt-specific ---
/** Fraction of 'hutang' orders that get debt records (CUSTOMER type, linked to pesanan) */
export const DEBT_FROM_ORDER_RATE = 1.0;

// Debt status distribution for debts
export const DEBT_STATUS_WEIGHTS = {
  BELUM_LUNAS: 0.30,
  SEBAGIAN: 0.30,
  LUNAS: 0.35,
  DIBATALKAN: 0.05,
} as const;

// --- Supplier debt (not linked to orders) ---
export const SUPPLIER_DEBT_COUNT = 50;
export const SUPPLIER_NAMES: readonly string[] = [
  'UD Maju Jaya', 'Toko Bahan Pak Karjo', 'CV Rasa Nusantara', 'UD Sejahtera',
  'Toko Arang Berkah', 'UD Sumber Rezeki', 'CV Pangan Makmur', 'Toko Es Pak Darmo',
  'UD Bumbu Lengkap', 'CV Aneka Rempah', 'Toko Gas Pak Slamet', 'UD Bahan Kue',
];

// --- Expense categories ---
export interface ExpenseCategoryConfig {
  nama: string;
  jenis: 'pengeluaran';
  frequency: 'daily' | 'weekly' | 'monthly' | 'occasional';
  minAmount: number;
  maxAmount: number;
  weight: number;
}

export const EXPENSE_CATEGORIES: readonly ExpenseCategoryConfig[] = [
  { nama: 'Bahan Baku', jenis: 'pengeluaran', frequency: 'daily', minAmount: 50000, maxAmount: 500000, weight: 0.35 },
  { nama: 'Gas LPG', jenis: 'pengeluaran', frequency: 'weekly', minAmount: 20000, maxAmount: 60000, weight: 0.10 },
  { nama: 'Arang', jenis: 'pengeluaran', frequency: 'weekly', minAmount: 30000, maxAmount: 80000, weight: 0.08 },
  { nama: 'Operasional', jenis: 'pengeluaran', frequency: 'weekly', minAmount: 10000, maxAmount: 100000, weight: 0.10 },
  { nama: 'Listrik', jenis: 'pengeluaran', frequency: 'monthly', minAmount: 100000, maxAmount: 300000, weight: 0.05 },
  { nama: 'Sewa Tempat', jenis: 'pengeluaran', frequency: 'monthly', minAmount: 500000, maxAmount: 1500000, weight: 0.05 },
  { nama: 'Gaji Karyawan', jenis: 'pengeluaran', frequency: 'monthly', minAmount: 1000000, maxAmount: 2500000, weight: 0.05 },
  { nama: 'Transportasi', jenis: 'pengeluaran', frequency: 'occasional', minAmount: 10000, maxAmount: 50000, weight: 0.07 },
  { nama: 'Peralatan', jenis: 'pengeluaran', frequency: 'occasional', minAmount: 20000, maxAmount: 500000, weight: 0.05 },
  { nama: 'Kebersihan', jenis: 'pengeluaran', frequency: 'weekly', minAmount: 5000, maxAmount: 30000, weight: 0.05 },
  { nama: 'Lain-lain', jenis: 'pengeluaran', frequency: 'occasional', minAmount: 5000, maxAmount: 200000, weight: 0.05 },
];

// --- Income categories (for POS sales pemasukan) ---
export const INCOME_CATEGORY_POS = 'Penjualan';
export const INCOME_CATEGORY_DEBT_PAYMENT = 'Pembayaran Piutang';
export const INCOME_CATEGORY_DEBT_SUPPLIER = 'Pembayaran Utang';

// --- Waste distribution ---
export const WASTE_REASON_WEIGHTS: ReadonlyArray<{ reason: string; weight: number }> = [
  { reason: 'BASI', weight: 0.25 },
  { reason: 'RUSAK', weight: 0.15 },
  { reason: 'GOSONG', weight: 0.15 },
  { reason: 'JATUH', weight: 0.10 },
  { reason: 'SALAH_PRODUKSI', weight: 0.10 },
  { reason: 'SISA_PRODUKSI', weight: 0.10 },
  { reason: 'KADALUARSA', weight: 0.05 },
  { reason: 'HILANG', weight: 0.05 },
  { reason: 'LAINNYA', weight: 0.05 },
];

// --- Budget allocations ---
export interface BudgetConfig {
  name: string;
  percentage: number;
  description: string;
}

export const BUDGET_ALLOCATIONS: readonly BudgetConfig[] = [
  { name: 'Bahan Baku', percentage: 35, description: 'Alokasi untuk pembelian bahan baku harian' },
  { name: 'Operasional', percentage: 15, description: 'Biaya operasional harian (gas, listrik, air)' },
  { name: 'Gaji', percentage: 20, description: 'Gaji owner dan karyawan' },
  { name: 'Tabungan', percentage: 15, description: 'Dana tabungan usaha' },
  { name: 'Dana Darurat', percentage: 5, description: 'Dana cadangan untuk keadaan darurat' },
  { name: 'Pengembangan Usaha', percentage: 10, description: 'Investasi dan pengembangan' },
];

// --- Menu products ---
export interface MenuConfig {
  nama_item: string;
  kategori: 'bakaran' | 'jajanan' | 'minuman' | 'makanan';
  stok: number;
  harga_modal: number;
  harga_jual: number;
  popularity: number; // weight for selection probability
}

export const MENU_PRODUCTS: readonly MenuConfig[] = [
  // bakaran - very popular at angkringan
  { nama_item: 'Sate Kulit', kategori: 'bakaran', stok: 200, harga_modal: 1500, harga_jual: 3000, popularity: 1.0 },
  { nama_item: 'Sate Usus', kategori: 'bakaran', stok: 200, harga_modal: 1200, harga_jual: 3000, popularity: 0.90 },
  { nama_item: 'Sate Telur Puyuh', kategori: 'bakaran', stok: 150, harga_modal: 1800, harga_jual: 3000, popularity: 0.85 },
  { nama_item: 'Sate Ceker', kategori: 'bakaran', stok: 150, harga_modal: 1500, harga_jual: 3000, popularity: 0.75 },
  { nama_item: 'Sate Ati', kategori: 'bakaran', stok: 120, harga_modal: 2000, harga_jual: 3000, popularity: 0.65 },
  { nama_item: 'Sate Kerang', kategori: 'bakaran', stok: 100, harga_modal: 2500, harga_jual: 4000, popularity: 0.50 },
  { nama_item: 'Sate Jamur', kategori: 'bakaran', stok: 80, harga_modal: 1800, harga_jual: 3000, popularity: 0.40 },
  { nama_item: 'Sate Sosis', kategori: 'bakaran', stok: 100, harga_modal: 2000, harga_jual: 4000, popularity: 0.55 },
  { nama_item: 'Ikan Bakar Kecil', kategori: 'bakaran', stok: 60, harga_modal: 4000, harga_jual: 8000, popularity: 0.35 },
  { nama_item: 'Cumi Bakar', kategori: 'bakaran', stok: 40, harga_modal: 6000, harga_jual: 12000, popularity: 0.25 },

  // minuman
  { nama_item: 'Es Teh Manis', kategori: 'minuman', stok: 300, harga_modal: 1000, harga_jual: 3000, popularity: 0.95 },
  { nama_item: 'Es Jeruk', kategori: 'minuman', stok: 200, harga_modal: 1500, harga_jual: 4000, popularity: 0.70 },
  { nama_item: 'Kopi Hitam', kategori: 'minuman', stok: 250, harga_modal: 1000, harga_jual: 3000, popularity: 0.80 },
  { nama_item: 'Kopi Susu', kategori: 'minuman', stok: 200, harga_modal: 2000, harga_jual: 5000, popularity: 0.60 },
  { nama_item: 'Teh Anget', kategori: 'minuman', stok: 200, harga_modal: 800, harga_jual: 2000, popularity: 0.55 },
  { nama_item: 'Susu Jahe', kategori: 'minuman', stok: 100, harga_modal: 2000, harga_jual: 5000, popularity: 0.35 },
  { nama_item: 'Air Mineral', kategori: 'minuman', stok: 300, harga_modal: 1000, harga_jual: 2000, popularity: 0.45 },
  { nama_item: 'Es Coklat', kategori: 'minuman', stok: 120, harga_modal: 2500, harga_jual: 5000, popularity: 0.40 },

  // makanan
  { nama_item: 'Nasi Kucing', kategori: 'makanan', stok: 200, harga_modal: 1500, harga_jual: 3000, popularity: 0.90 },
  { nama_item: 'Nasi Kucing Ayam Suwir', kategori: 'makanan', stok: 150, harga_modal: 2000, harga_jual: 4000, popularity: 0.75 },
  { nama_item: 'Nasi Kucing Teri', kategori: 'makanan', stok: 150, harga_modal: 1800, harga_jual: 3000, popularity: 0.65 },
  { nama_item: 'Nasi Kucing Sambal', kategori: 'makanan', stok: 150, harga_modal: 1500, harga_jual: 3000, popularity: 0.70 },
  { nama_item: 'Nasi Goreng Angkringan', kategori: 'makanan', stok: 80, harga_modal: 4000, harga_jual: 8000, popularity: 0.50 },
  { nama_item: 'Mie Goreng', kategori: 'makanan', stok: 80, harga_modal: 3000, harga_jual: 7000, popularity: 0.40 },
  { nama_item: 'Gorengan Campur', kategori: 'makanan', stok: 200, harga_modal: 800, harga_jual: 2000, popularity: 0.80 },

  // jajanan
  { nama_item: 'Pisang Goreng', kategori: 'jajanan', stok: 150, harga_modal: 1000, harga_jual: 2000, popularity: 0.55 },
  { nama_item: 'Tahu Goreng', kategori: 'jajanan', stok: 200, harga_modal: 600, harga_jual: 1500, popularity: 0.50 },
  { nama_item: 'Tempe Goreng', kategori: 'jajanan', stok: 200, harga_modal: 600, harga_jual: 1500, popularity: 0.50 },
  { nama_item: 'Bakwan', kategori: 'jajanan', stok: 150, harga_modal: 700, harga_jual: 1500, popularity: 0.45 },
  { nama_item: 'Mendoan', kategori: 'jajanan', stok: 100, harga_modal: 800, harga_jual: 2000, popularity: 0.40 },
  { nama_item: 'Cireng', kategori: 'jajanan', stok: 80, harga_modal: 600, harga_jual: 2000, popularity: 0.30 },
  { nama_item: 'Kerupuk', kategori: 'jajanan', stok: 300, harga_modal: 300, harga_jual: 1000, popularity: 0.60 },

  // Edge case: rarely sold
  { nama_item: 'Nasi Bakar Spesial', kategori: 'makanan', stok: 20, harga_modal: 8000, harga_jual: 15000, popularity: 0.10 },
  { nama_item: 'Wedang Uwuh', kategori: 'minuman', stok: 30, harga_modal: 3000, harga_jual: 7000, popularity: 0.08 },
  { nama_item: 'Sate Lidah', kategori: 'bakaran', stok: 20, harga_modal: 5000, harga_jual: 10000, popularity: 0.05 },
];

// --- Ingredient master data ---
export interface IngredientConfig {
  name: string;
  stock: number;
  unit: string;
  cost_per_unit: number;
}

export const INGREDIENTS: readonly IngredientConfig[] = [
  { name: 'Beras', stock: 50, unit: 'kg', cost_per_unit: 12000 },
  { name: 'Gula Pasir', stock: 20, unit: 'kg', cost_per_unit: 15000 },
  { name: 'Minyak Goreng', stock: 15, unit: 'liter', cost_per_unit: 18000 },
  { name: 'Teh Celup', stock: 100, unit: 'pcs', cost_per_unit: 500 },
  { name: 'Kopi Bubuk', stock: 10, unit: 'kg', cost_per_unit: 50000 },
  { name: 'Arang', stock: 30, unit: 'kg', cost_per_unit: 8000 },
  { name: 'Gas LPG 3kg', stock: 5, unit: 'tabung', cost_per_unit: 20000 },
  { name: 'Kecap Manis', stock: 10, unit: 'botol', cost_per_unit: 12000 },
  { name: 'Sambal', stock: 10, unit: 'botol', cost_per_unit: 10000 },
  { name: 'Garam', stock: 5, unit: 'kg', cost_per_unit: 5000 },
];
