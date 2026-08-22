# API Documentation: Laporan Kas & Keuangan

## 1. Overview
Modul "Cash & Finance Reports" merupakan ujung tombak monitoring transaksi aktual Angkringan 88. Sesuai prinsip akuntansi sistem, modul ini membedakan secara tegas antara nilai Profit / Omzet kotor dengan status uang riil (Kas Masuk/Keluar).

## 2. Authentication & Authorization
Semua endpoint dilindungi menggunakan header:
`Authorization: Bearer <token>`
Selain itu, diberlakukan role base access (RBAC). 

**Permissions yang dibutuhkan**:
- `cash.report.read` - Dashboard Kas
- `cash.transaction.read` - Daftar Riwayat Transaksi
- `cash.budget.(read/create/update/delete)` - Pengelolaan Budget
- `cash.reconciliation.create` - Pencatatan Selisih Fisik/Rekonsil

## 3. Endpoints Utama Laporan

### A. GET `/api/cash/reports`
Mengambil Laporan lengkap (Saldo awal mula, Kas Masuk, Keluar, Saldo akhir).
**Query Params**:
- `period` = `7days` | `30days` | `month` | `year` | `custom`
- `startDate` & `endDate` (Jika `custom`)

**Response**: (Status: 200 OK)
```json
{
  "success": true,
  "data": {
    "summary": { "opening_balance": 0, "net_cash_flow": 1200000, "closing_balance": 1200000 },
    "payment_methods": {
       "tunai": { "closing_balance": 500000 }
    },
    "sales": { "total_revenue": 100000, "cash_sales": 100000 },
    "debt": { "total_payment_received": 100000 },
    "budget": {
       "total_percentage": 40,
       "remaining_amount": 720000,
       "allocations": [ { "name": "Gaji", "amount": 480000 } ]
    }
  }
}
```

### B. GET `/api/cash/transactions`
Menarik ledger / History kas riil.
**Query Params**:
- `page`, `limit` (Pagination default 1, 20)
- `type` (CASH_IN / CASH_OUT)
- `search`
- `source_type` (POS, DEBT_PAYMENT, INCOME, EXPENSE)
- `payment_method` (tunai/qris/transfer)

## 4. Validasi & Error (Exception)
- **400 Bad Request**: Dikirim apabila persentase input Budget melibihi `100%`, atau DTO class param tidak terpenuhi.
- **403 Forbidden**: Terjadi jika jwt kredensial gagal otorisasi permission RBAC di guard.

## 5. Notes on Double Counting & Ledger
- Data disuntikkan murni lewat API transasional (seperti `POST /debts/:id/payments` atau status pelunasan POS `PATCH /pesanan/:id`).
- Ledger akan langsung menerjemahkan transaksi dari `transaksi_keuangan` sehingga duplikasi kas dijamin *Zero-Incidence*.
- Budget yang di-set HANYA menampilkan *planned amounts* dan tidak sedikitpun merubah *Current Cash Balance* sebelum direalisasi ke Pengeluaran (Expense) riil.
