# 📖 Dokumentasi Teknis & API - Modul POS Kasir & Transaksi Keuangan

Dokumentasi ini mencakup alur kerja, arsitektur, dan daftar endpoint untuk operasi Point of Sales (POS), Dashboard, Laporan, dan Pencatatan Keuangan Manual pada Backend Angkringan.

---

## 📌 Ringkasan Arsitektur & Aturan Sistem

### 1. Pesanan (POS Kasir)
- Semua pesanan akan melalui tabel `pesanan` dan `detail_pesanan`.
- Stok akan otomatis terpotong saat pesanan disubmit (`POST /pos-kasir`).
- Jika pesanan belum dibayar / hutang dihapus, stok otomatis akan ditambahkan kembali.
- Nomor Pesanan berjalan berurutan secara otomatis berdasarkan auto-increment (contoh: `PSN-0001`).

### 2. Integrasi Pembayaran Keuangan Lintas Tabel
- Diatur pada `PATCH /pos-kasir/:id/pembayaran`.
- Apabila pesanan berstatus **lunas**, sistem akan menginsertekan data baru ke `transaksi_keuangan` sebagai "pemasukan" dengan kategori bawaan "Penjualan POS".
- Jika status diubah ke **hutang**, **tidak** ada insert ke tabel transaksi.
- Transaksi dibungkus menggunakan Prisma `$transaction` yang akan otomatis me-_rollback_ seluruh step apabila salah satu step gagal, memastikan data tetap bersih dan mencegah anomali.

### 3. Keuangan & Kategori
- Digunakan untuk pencatatan operasi luar pesanan seperti _Uang Kas, Bayar Listrik, dan Modal Aset_.
- Format transaksi digenerate auto (contoh: `TRX-000001`). Kategori yang sama tidak boleh didelete bila sudah terkait ke Transaksi.

### 4. Pelaporan
- Range filter query dihandle otomatis sesuai kategori request (harian, mingguan, bulanan, tahunan) serta menghasilkan info komprehensif berupa Laba Bersih yang terisolasi per kategori atau per jenis.

---

## 🚀 Daftar Endpoint API

*(Gunakan JWT Token di header `Authorization: Bearer <token>` untuk seluruh endpoint pada modul ini)*

### 1. Pesanan / POS Kasir (`/api/pos-kasir`)

#### A. Buat Pesanan Baru (`POST /api/pos-kasir`)
- **Deskripsi**: Menyimpan pesanan dari layar kasir dan memotong stok item otomatis.
- **Request Body**:
```json
{
  "nama_pelanggan": "Pelanggan VIP",
  "items": [
      { "id_menu": 1, "jumlah": 2 },
      { "id_menu": 5, "jumlah": 1 }
  ]
}
```

#### B. Ambil Daftar Pesanan (`GET /api/pos-kasir`)
- **Deskripsi**: Mengambil riwayat antrean pesanan beserta fitur pencarian nomor dan paging. Termasuk list tabel relasinya.
- **Query Parameter**: `?page=1&limit=10&search=PSN&status=belum_bayar&sort=created_at&order=desc`

#### C. Detail Pesanan (`GET /api/pos-kasir/:id`)
- **Deskripsi**: Membaca satu ID dengan include `detail_pesanan`.

#### D. Update Pembayaran Pesanan (`PATCH /api/pos-kasir/:id/pembayaran`)
- **Deskripsi**: Merubah status transaksi ke kasir. **(Memicu Log Transaksi Keuangan Jika Lunas)**
- **Request Body**:
```json
{
  "status": "lunas",
  "metode_pembayaran": "qris" 
}
```

#### E. Hapus Pesanan (`DELETE /api/pos-kasir/:id`)
- **Deskripsi**: Hapus pesanan yg salah input / dicancel. Hanya bisa jika status belum lunas! (stok akan kembali otomatis)

---

### 2. Kategori Keuangan (`/api/kategori-keuangan`)

#### A. Tambah Kategori (`POST /api/kategori-keuangan`)
- **Deskripsi**: Menambah opsi catatan keuangan.
- **Request Body**:
```json
{
  "nama": "Operasional Harian",
  "jenis": "pengeluaran"
}
```

#### B. Daftar Kategori (`GET /api/kategori-keuangan`), Update Kategori (`PATCH /:id`), dan Hapus (`DELETE /:id`).

---

### 3. Transaksi Keuangan Tambahan (`/api/transaksi-keuangan`)

#### A. Catat Pemasukan / Pengeluaran Manual (`POST /api/transaksi-keuangan/pemasukan` & `/pengeluaran`)
- **Deskripsi**: Catatan ke kas tanpa perlu order pesanan POS. 
- **Request Body**:
```json
{
  "id_kategori": 1,
  "nominal": 150000,
  "metode_pembayaran": "tunai",
  "keterangan": "Uang Kas Laci"
}
```

#### B. Riwayat Kas (`GET /api/transaksi-keuangan`)
- **Query Params**: `?jenis=pemasukan&id_kategori=1&search=TRX`

---

### 4. Pelaporan Terpadu (`/api/laporan`)

Memberikan report laba bersih dan agregasi di belakang layar.

- **GET `/api/laporan/harian`**
- **GET `/api/laporan/mingguan`**
- **GET `/api/laporan/bulanan`**
- **GET `/api/laporan/tahunan`**

- **URL Filter Tambahan**: `?start_date=2024-01-01&end_date=2024-12-31&jenis=pengeluaran`
- **Contoh Reponse Data**:
```json
{
  "summary": {
    "total_pemasukan": 500000,
    "total_pengeluaran": 50000,
    "laba_bersih": 450000
  },
  "transaksi": [ ...list data as array ]
}
```

---

### 5. Insight Dashboard (`/api/dashboard`)

- **GET `/api/dashboard`**
Satu endpoint lengkap (Super Query Array) yang merangkum keseluruhan aktivitas backend dalam sekali pancar. Berisi 5 objek utama bagi layar Dashboard:
1. `ringkasan`: Info total uang masuk, keluar, laba, pesanan utang & lunas Hari / Bulan ini.
2. `grafik_7_hari`: Data deret waktu mundur (7 Hari) untuk Bar Chart Laba per hari.
3. `top_menus`: 10 item masakan terlaris di bulan berjalan.
4. `transaksi_terbaru`: Log list 10 uang masuk/keluar teranyar.
5. `pesanan_terbaru`: List 10 pelanggan pesanan meja terbaru.

---

**Selesai**. Dibuat sesuai _Clean Architecture_ dan standar _Entity Data Type (TypeScript, dtos, prisma transactions)_. Semua Controller sudah diekspor ke Swagger API v1.0.
