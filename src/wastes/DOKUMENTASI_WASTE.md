# Dokumentasi Fitur Pencatatan Barang Terbuang (Waste)

## 1. Tujuan Fitur
Fitur ini digunakan untuk mencatat barang atau bahan baku yang terbuang (rusak, basi, hilang, dll). Setiap record akan mengurangi stok, menghitung kerugian (berdasarkan HPP / Cost), dan mencatat pergerakan stok (Stock Movement). Waste bukan pengeluaran kas.

## 2. Arsitektur
- **Controller (`WastesController`)**: Menangani endpoint REST API.
- **Service (`WastesService`)**: Berisi konduktor logika bisnis, validasi, perhitungan, dan database transaction.
- **DTOs (`CreateWasteDto`, `UpdateWasteDto`)**: Validasi tipe data dan payload.
- **Prisma Schema**: `waste`, `ingredient`, dan `stock_movement`.

## 3. Database & Relasi
- **Waste**: Tabel utama pencatatan (berisi quantity, cost_per_unit, total_loss, reason). Merujuk ke `katalog_menu` (untuk PRODUCT) atau `ingredient` (untuk INGREDIENT).
- **Stock Movement**: Mencatat historis pergerakan stok dengan `type` `WASTE`. Berelasi kembali ke `waste` untuk jejak audit.

## 4. Flow Create Waste
1. Validasi di DTO (Type, item_id, quantity > 0, reason).
2. Authorization & RBAC (`WASTE_CREATE` permission).
3. Mulai Prisma Transaction:
   - Cek apakah type PRODUCT / INGREDIENT.
   - Baca record item dari `katalog_menu` atau `ingredient`. 
   - Validasi ketersediaan stok (`stock >= quantity`). Throw error jika tidak cukup.
   - Ambil `harga_modal` / `cost_per_unit`.
   - Hitung `total_loss = cost_per_unit * quantity`.
   - Kurangi stok barang terkait.
   - Simpan `waste` record dengan harga tercapture (Snapshotted).
   - Buat `stock_movement` record untuk penyesuaian delta `-quantity`.
4. Commit & Return success response. (Jika salah satu error, seluruh state di rollback otomatis oleh Prisma).

## 5. Flow Update Waste
Hanya memperbolehkan update kuantitas, catatan, dan alasan. `type` dan `item_id` dilarang untuk diubah agar data historikal tetap konsisten.
- Jika kuantitas berubah, dihitung delta/selisih-nya.
- Stok disesuaikan dengan selisih tersebut (contoh: dari 5 ke 2, maka stok dikembalikan +3).
- Diciptakan stock movement `ADJUSTMENT` tambahan.
- Disimpan dalam Transaction.

## 6. Flow Delete Waste
- Mengambil detail waste.
- Mengembalikan stok yang sebelumnya dikurangi (stok + waste.quantity).
- Menghapus record `stock_movement` terkait (`deleteMany` berdasarkan `id_waste`).
- Menghapus record `waste` (Hard delete dengan pengembalian referensial).
- Semua di-wrap dengan Prisma Transaction.

## 7. Business Logic (HPP & Loss Calculation)
HPP diambil pada saat transaksi dari master data (`harga_modal` / `cost_per_unit`). Dikalikan dengan quantity untuk menghasilkan `total_loss`. Nilai ini disimpan sebagai snapshot. Perubahan HPP master di masa depan tidak mempengaruhi hitungan histori kerugian.

## 8. Role Based Access (Permission)
- `waste.read`: Membaca data dan list.
- `waste.create`: Mencatat barang terbuang.
- `waste.update`: Mengupdate.
- `waste.delete`: Menghapus.
- `waste.analysis`: Melihat dashboard summary dan analitik (total loss, rasio, chart).

## 9. Endpoint
### GET /wastes
Mendapatkan daftar waste (mendukung `search`, `page`, `limit`, `startDate`, `endDate`, `type`, dll).

### GET /wastes/:id
Mendapatkan detail dari ID spesifik.

### POST /wastes
Membuat record baru.
Body:
```json
{
  "type": "INGREDIENT",
  "item_id": 12,
  "quantity": 2,
  "reason": "BASI",
  "note": "Sudah berbau"
}
```

### PATCH /wastes/:id
Koreksi data. Body sama (Partial).

### DELETE /wastes/:id
Hapus data.

### GET /wastes/summary
Menampilkan metric loss dan total item.

### GET /wastes/analysis
Aggregasi untuk pie chart (berdasarkan alasan), bar chart (berdasarkan top item / hari), dan perbandingan waste ratio. Timezone menggunakan UTC default date dan support ISO string dari frontend WIB.
