# API Documentation - modul Hutang/Piutang (Debt)

Seluruh endpoint diproteksi oleh JWT dan RBAC Permission. Prefix endpoint adalah `/api/debts`.

### 1. GET `/api/debts`
- **Desc**: Mengambil list hutang (mendukung paginasi & filter).
- **Permissions**: `debt.read`
- **Query Params**: `type` (CUSTOMER/SUPPLIER), `status` (BELUM_LUNAS|SEBAGIAN|LUNAS|DIBATALKAN), `search`, `page`, `limit`.

### 2. POST `/api/debts`
- **Desc**: Pembuatan manual piutang pelanggan atau utang supplier (tanpa lewat POS).
- **Permissions**: `debt.create`
- **Body**: 
  ```json
  {
    "type": "CUSTOMER",
    "customer_name": "Budi",
    "total_amount": 100000,
    "note": "Hutang manual"
  }
  ```

### 3. GET `/api/debts/summary`
- **Desc**: Mengembalikan total statistik (Total Piutang, Piutang Terbayar, Sisa Piutang, Total Utang, Utang Terbayar, Sisa Utang).
- **Permissions**: `debt.read`

### 4. GET `/api/debts/:id`
- **Desc**: Mengambil detil spesifik Debt beserta histori pembayaran dan order POS terkait jika ada.
- **Permissions**: `debt.read`

### 5. PATCH `/api/debts/:id`
- **Desc**: Memperbarui detil (nama pelanggan/supplier, note) hutang. Tidak bisa memperbarui nominal dari sini (harus lewat payment).
- **Permissions**: `debt.update`

### 6. POST `/api/debts/:id/cancel`
- **Desc**: Membatalkan catatan hutang (status menjadi DIBATALKAN). Histori tetap tersimpan.
- **Permissions**: `debt.cancel`

### 7. POST `/api/debts/:id/payments`
- **Desc**: Membayar sisa tagihan hutang.
- **Permissions**: `debt.payment`
- **Body**:
  ```json
  {
    "amount": 50000,
    "payment_method": "tunai"
  }
  ```

### 8. GET `/api/debts/:id/payments`
- **Desc**: Mengambil histori pembayaran sebuah hutang id.
- **Permissions**: `debt.read`

### 9. POST `/api/debts/from-transaction/:transactionId`
- **Desc**: Convert pesanan POS (id_pesanan) menjadi Debt tipe `CUSTOMER`, jika pelanggan belum/baru membayar sebagian.
- **Permissions**: `debt.create`
- **Body**: `initial_payment_amount` (opsional), `payment_method` (opsional namun wajib bila ada nominal), `customer_name` (opsional).
