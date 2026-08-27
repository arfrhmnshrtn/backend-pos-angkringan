# Final Implementation Report: Summary Barang Terjual & Pengeluaran Bahan Baku

Berikut adalah laporan lengkap hasil integrasi backend dan frontend.

## 1. ANALISIS SCHEMA
- Tabel pengeluaran (`transaksi_keuangan`) dan katalog/pesanan dianalisa. `transaksi_keuangan` bersifat umum (pemasukan/pengeluaran) tanpa dukungan list item untuk pencatatan bahan baku.
- Detail pesanan (`detail_pesanan`) sudah memiliki `harga_modal` (snapshot purchase price) dan `subtotal` (snapshot raw revenue) per transaksi, hal ini ideal untuk kalkulasi harga jual & harga modal secara historis tanpa mempengaruhi jika `katalog_menu` harganya berubah.

## 2. MODEL YANG DIGUNAKAN
- `kategori_keuangan` untuk mendefinisikan kategori 'Bahan Baku'
- `transaksi_keuangan` sebagai root expense agar masuk secara otomatis ke perhitungan `CASH_OUT` / `Laporan Kas`
- `pesanan` dan `detail_pesanan` untuk aggregation "Barang Terjual"

## 3. MODEL YANG DIUBAH (DITAMBAHKAN)
- Menambahkan entitas baru `pengeluaran_bahan_baku` dengan relasi 1-to-1 (`id_transaksi_keuangan @unique`) agar setiap pembelian bahan baku menjadi detail eksplisit dari sebuah entri `transaksi_keuangan`.

## 4. MIGRATION
- `npx prisma migrate dev --name add_pengeluaran_bahan_baku` telah dieksekusi dengan sukses. Prisma schema sudah up-to-date.

## 5. BACKEND FILE YANG DIBUAT
- `src/pos_kasir/dto/pengeluaran-bahan-baku.dto.ts`
- `src/pos_kasir/services/pengeluaran-bahan-baku.service.ts`
- `src/pos_kasir/controllers/pengeluaran-bahan-baku.controller.ts`

## 6. BACKEND FILE YANG DIUBAH
- `prisma/schema.prisma`
- `src/analysis/analysis.controller.ts`
- `src/analysis/analysis.service.ts`
- `src/pos_kasir/pos_kasir.module.ts`
- `src/common/constants/index.ts` (penyesuaian permission `CASH_TRANSACTION_*`)

## 7. ENDPOINT BARU
- `GET /analysis/products-sold`
- `GET /expenses/materials`
- `POST /expenses/materials`
- `PATCH /expenses/materials/:id`
- `DELETE /expenses/materials/:id`

## 8. ENDPOINT EXISTING YANG DIINTEGRASIKAN
- Tidak menambah redundancy pada `/analysis/sales`. Endpoint dibuat modular dengan reuse utilities pengolahan date yang sama dari `calculatePeriodBounds()`.

## 9. BUSINESS LOGIC SUMMARY
- **Aggregation**: Menghitung kuantitas terjual berdasarkan histori LUNAS di rentang waktu yang direquest.
- **Selling Price Avg**: Karena ada snapshoting per order (`subtotal`), harga jual rata-rata didapatkan dr (`Total Revenue per Item` / `Total Quantity`).
- **Cost Avg**: Dihitung dari snapshot (`harga_modal` di transaksi * jumlah, lalu dirata-rata).
- **Profit Margin**: Sesuai dengan rumus `(Profit / Revenue) * 100`.

## 10. BUSINESS LOGIC EXPENSE
- **Transaction Safe**: Saat `create`, Prisma `$transaction` digunakan untuk membuat entri `transaksi_keuangan` dan `pengeluaran_bahan_baku` sekaligus. Jika gagal, keduanya di-_rollback_.
- **Update propagation**: Jika jumlah atau harga satuan di-edit, `total_price` dihitung ulang backend, dan tabel `transaksi_keuangan.nominal` otomatis di-update (sinkronisasi laporan keuangan).
- **Delete propagation**: Karena memakai referensi Prisma tipe `Cascade Delete`, menghapus `/expenses/materials/:id` akan sekaligus membatalkan `transaksi_keuangan` sehingga cash out akan kembali seimbang.

## 11. FRONTEND FILE YANG DIBUAT
- `src/pages/analysis/ProductsSoldPage.jsx`
- `src/pages/expenses/MaterialExpensesPage.jsx`
- `src/services/material-expense.service.js`

## 12. FRONTEND FILE YANG DIUBAH
- `src/services/analysis.service.js` (menambahkan wrapper API call)
- `src/App.jsx` (menambah lazy components & logic rendering `activeTab`)
- `src/components/layout/Sidebar.jsx` (menambah tombol Laporan Barang Terjual & Pengeluaran Bahan Baku)
- `src/router/AppRouter.jsx` (mendaftarkan page ke RBAC router react).

## 13. ROUTING
- Karena arsitektur frontend menggunakan kombinasi `MemoryRouter / Hash-based` dengan `activeTab`, navigasi di-_extend_ melalui switch state string: `activeTab === 'barang-terjual'` dan `activeTab === 'bahan-baku'`. Routing via URL di `AppRouter.jsx` juga sudah ditambahkan untuk mendukung RBAC jika modul ini dipanggil by path.

## 14. API SERVICE
- Menggunakan `axios.js` existing bawaan project, sehingga HTTP interception dan handling header Bearer token (JWT) tetap aman.

## 15. COMPONENT
- Penggunaan library component existing bawaan `Card`, `Table`, `Input`, `Modal`, `Button`, `ConfirmDialog`, `AnalysisFilters`.
- Pemanfaatan `formatCurrency` dan `formatDate` utilities. 
- Form di `MaterialExpensesPage.jsx` memanfaatkan native math di client *only* for feedback (displaying temporary total cost), perhitungan aseli untuk input database tetap diperhitungkan strict oleh backend.

## 16. PERMISSION
- Menambahkan key string permission di Backend `PERMISSIONS`(`index.ts` / constant file).
- `CASH_TRANSACTION_CREATE/READ/UPDATE/DELETE` difungsikan untuk menjaga limitasi.
- **Frontend Check**: Modul hide/show mengacu pada `useAuth()` hook dan parameter role `OWNER`/`KASIR` dan validasi `.hasPermission()`.

## 17. VALIDATION
- Backend: DTO ter-decorasi `class-validator` secara solid (pencegah min=0 dan String injection).
- Frontend: Required flags dan proteksi NaN pada on-change events. Custom error response rendering yang ditangkap dari Axios `err.response.data.message`.

## 18. TESTING
- Tested Typescript builds (via `npm run build`), tidak ditemukan syntax error (hanya TypeScript stale cache sementara sewaktu compile). 
- Tested Prisma Database push/migration schema sukses.

## 19. SWAGGER & API DOCS
- Semua controller function dilengkapi `@ApiOperation`, `@ApiResponse`, `@ApiTags`, dan `@ApiBearerAuth` memprioritaskan REST API generation yang readable untuk FrontEnd developers yang ingin mengeksekusi integrasi 3rd party.

## 20. CARA MENJALANKAN (Testing Live System)
- Buka dashboard admin / owner, pastikan sidebar anda up-to-date (sudah refresh browser).
- Klik Laporan & Keuangan > Laporan Barang Terjual & Pengeluaran Bahan Baku
- Coba rekam 1 transaksi di backend / manual (Pengeluaran > Bahan baku).
- Cek ke 'Laporan Kas' tab (Jika sudah ada data ini, total expense cash kas harian akan ikut terpotong).

## 21. POTENSI MASALAH
- Pastikan bahwa `CASH_TRANSACTION_*` permission sudah di-*grant* ke tabel `permission` PostgreSQL dalam seed database jika anda ingin user selain `OWNER` bs mengakses, karena jika tidak, endpoint 403 error, solusinya gunakan SQL dump/seeding permission.
