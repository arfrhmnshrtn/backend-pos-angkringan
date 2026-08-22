# Cash Flow Architecture
# POS Angkringan 88

## 1. Overview
Sistem "Laporan Kas & Keuangan" dibangun untuk memisahkan secara jelas antara Omzet (pendapatan bersih/kotor), Laba (Profit), dan Kas Aktual (Cash Flow). Modul ini bekerja dengan me-rekap seluruh transaksi yang telah terjadi tanpa melakukan "Double Counting".

## 2. Architecture & Data Source
Sistem tidak menggunakan tabel Ledger perantara baru. Sebagai sumber kebenaran utama (Single Source of Truth), sistem menggunakan tabel `transaksi_keuangan` existing yang memang sudah dicatat setiap kali dana masuk atau keluar melalui aplikasi (Flow *Event-Sourced*).

- `CASH_IN` dipetakan dari kolom `jenis = 'pemasukan'`
- `CASH_OUT` dipetakan dari kolom `jenis = 'pengeluaran'`

### A. Alur Pencatatan (Event Flow)
```
 POS (Pesanan Lunas)
  ↓
 transaksi_keuangan (CASH_IN)
  ↓
 Cash Report Backend

 Debt (Pembayaran Sebagian/Lunas)
  ↓
 debt_payment
  ↓ 
 transaksi_keuangan (CASH_IN)
  ↓
 Cash Report Backend

 Income & Expense Manual
  ↓
 transaksi_keuangan (CASH_IN / CASH_OUT)
  ↓
 Cash Report Backend
```

### B. Accounting Rules
- Omzet **Bukan** Kas: Ketika Pelanggan memesan secara HUTANG, POS tidak akan mencatatnya sebagai Kas (tidak masuk ke `transaksi_keuangan`), sehingga Saldo Kas tidak naik, namun Omzet/Piutang bertambah.
- Budget **Bukan** Cash Out: Budget (`budget_allocation`) hanyalah merupakan target alokasi (Planned), dan baru menjadi aktual jika ada catatan Pengeluaran Manual di luar budget.

## 3. Handling Idempotency & Double Counting
Double counting telah dicegah pada tingkat `Service` (CashService) maupun di tingkat Database Relasi. 
- Satu `id_pesanan` untuk pos hanya dicetak 1 kali di `transaksi_keuangan`.
- Satu kali ID pembayaran `debt_payment` juga direlasikan 1:1 ke tabel keuangan. 
- Dengan begitu, fungsi agregasi (`groupBy`) pada CashService hanya membaca 1 record yang valid unik, sehingga nilai uang tidak pernah ke-hitung ganda.

## 4. Endpoints & Features
1. `GET /api/cash/reports` - Dashboards lengkap (Omset, Laba kotor/bersih, Budget, Saldo).
2. `GET /api/cash/balance` - Hanya saldo Kas.
3. `GET /api/cash/flow` - Grafik cash flow (harian)
4. `GET /api/cash/transactions` - Riwayat lengkap (filter POS, INCOME, EXPENSE, dll)
5. `/api/cash/budget` - CRUD Budget setting
6. `POST /api/cash/reconciliation` - Melakukan cross-check dengan kas fisik. Jika selisih dan disetujui, mencatat Transaksi manual (Penyesuaian/Rekonsiliasi).
