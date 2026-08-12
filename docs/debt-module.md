# Implementasi Debt Module

## 1. Analisis Project
Backend menggunakan NestJS, Prisma, PostgreSQL. Modul Hutang/Piutang diimplementasikan dalam module terpisah (`DebtModule`) agar tidak mengganggu module `PosKasirModule` namun tetap saling terintegrasi (misal update status pesanan, pencatatan transaksi keuangan).

## 2. Database Changes
Model baru:
- `debt`: Menyimpan informasi hutang total, pembayaran masuk, sisa hutang, dan status.
- `debt_payment`: Menyimpan riwayat setiap kali pembayaran dilakukan, berelasi dengan `debt` dan `transaksi_keuangan`.

Enum baru: `debt_type` (`CUSTOMER`, `SUPPLIER`), `debt_status` (`BELUM_LUNAS`, `SEBAGIAN`, `LUNAS`, `DIBATALKAN`).

## 3. Backend Module
Terdiri dari:
- `DebtModule`: Membungkus service dan dependencies.
- `DebtController`: Mengatur routing, autentikasi (JWT + Permission Guard) dan Swagger metadata.
- `DebtService`: Mengandung business logic (Create Payment, Cancel Debt, Transaction safe updates).
- `debt.dto.ts`: Menggunakan `class-validator` untuk memvalidasi input.

## 4. Endpoint
Lihat `debt-api.md` untuk rincian:
POST `/api/debts`, GET `/api/debts`, GET `/api/debts/summary`, GET `/api/debts/:id`, dll.

## 5. Security & RBAC
Terdapat permission `debt.read`, `debt.create`, `debt.update`, `debt.cancel`, `debt.payment`, `debt.delete`. `OWNER` memiliki akses penuh. `KASIR` tidak memiliki akses (kecuali izin dasar POS). Terdapat guard pada seluruh endpoint.

## 6. Integrasi
- POS: Pesanan POS dapat dikonversi menjadi piutang.
- Keuangan: Piutang (CUSTOMER) tercatat otomatis sebagai `pemasukan`. Utang (SUPPLIER) tercatat sebagai `pengeluaran`.
