# Sales Analysis API Documentation

Dokumentasi untuk endpoint Analisis Penjualan pada sistem POS Angkringan.

## 1. Overview
Endpoint ini memberikan ringkasan (summary) penjualan, laba kotor, produk terlaris, serta rentang laporan penjualan berdasarkan periode yang dipilih. Analisis ini dihitung berdasarkan transaksi dengan status `lunas`. Transaksi berupa hutang belum lunas atau dibatalkan *tidak* dimasukkan ke dalam perhitungan omzet.

## 2. Authentication & Authorization

- **Authentication:** Membutuhkan JWT Token (Bearer token).
- **Authorization:** Membutuhkan permission `sales_analysis.read`.

Jika user tidak memiliki hak akses, API akan mengembalikan status `403 Forbidden`.

## 3. Endpoint

**HTTP Method:** GET  
**URL:** `/api/analysis/sales`  

*(Catatan: Prefix global menggunakan yang disesuaikan dalam proyek, asumsikan `/api` jika memang NestJS dikonfigurasi dengan global prefix. Jika tidak, cukup `/analysis/sales`)*

## 4. Query Parameter

Gunakan query string untuk memilih periode laporan:

| Parameter | Type   | Required | Keterangan |
| --------- | ------ | -------- | ---------- |
| `period`  | enum   | Optional | `today`, `7days`, `30days`, `month`, `year`, `custom` (default: 30days) |
| `startDate` | string | Optional | Format YYYY-MM-DD. Wajib diisi jika `period=custom` |
| `endDate`   | string | Optional | Format YYYY-MM-DD. Wajib diisi jika `period=custom` |

## 5. Business Rules & Perhitungan

Data yang digunakan untuk analisis berasal dari model `pesanan` dan `transaksi_keuangan` serta tabel histori hutang (`debt`).
Berikut adalah aturan perhitungannya:
- **Total Omzet (Revenue):** Hanya dihitung dari transaksi penjualan reguler (`pesanan`) yang memiliki status `lunas`. Total pembayaran dari transaksi hutang/dibatalkan *tidak dihitung* dalam omzet ini. Omzet diambil dari field `total_harga` pada order (`pesanan`).
- **Total Modal (Cost):** Berhubung pesanan pada PostgreSQL scheme existing belum menyimpan *snapshot harga modal* setiap item pada `detail_pesanan`, harga modal dihitung dari relasi menu (`detail_pesanan.menu.harga_modal`) pada saat laporan diambil, dikalikan dengan `jumlah` tiap terjual. (Karena kita merespond ini dengan actual structure yang existing di schema).
- **Laba Kotor (Gross Profit):** `Total Omzet` - `Total Modal`.
- **Margin Laba:** `(Laba Kotor / Total Omzet) * 100`.
- **Total Pengeluaran (Expense):** Total pergerakan rekapan dengan tag `pengeluaran` pada table `transaksi_keuangan` di sepanjang periode bersangkutan.
- **Laba Setelah Pengeluaran (Net Profit):** `Laba Kotor` - `Total Pengeluaran`.
- **Hutang:** Data ringkasan hutang baru, pembayaran cicilan hutang yang terjadi dalam rentang periode tersebut diambil dari tabel `debt` dan `debt_payment`.
- **Timezone:** Semua periode disesuaikan untuk WIB (`Asia/Jakarta`).

## 6. Request Example

**GET Request 30 Days (Implicit):**
```bash
curl -X GET "http://localhost:3000/analysis/sales?period=30days" \
  -H "Authorization: Bearer <accessToken>"
```

**GET Request Custom Dates:**
```bash
curl -X GET "http://localhost:3000/analysis/sales?period=custom&startDate=2026-08-01&endDate=2026-08-12" \
  -H "Authorization: Bearer <accessToken>"
```

## 7. Response Example

```json
{
  "success": true,
  "message": "Analisis penjualan berhasil diambil",
  "data": {
    "period": {
      "type": "custom",
      "start_date": "2026-08-01",
      "end_date": "2026-08-12"
    },
    "summary": {
      "total_revenue": 15000000,
      "total_transactions": 13,
      "total_items_sold": 45,
      "average_transaction": 115384,
      "total_cost": 8500000,
      "gross_profit": 6500000,
      "profit_margin": 43.33,
      "total_expense": 2000000,
      "net_profit": 4500000
    },
    "sales_chart": [
      {
        "date": "2026-08-01",
        "transaction_count": 5,
        "revenue": 5000000
      }
    ],
    "top_products": [
      {
        "ranking": 1,
        "id": 5,
        "name": "Sate Kulit",
        "category": "bakaran",
        "quantity": 100,
        "revenue": 300000,
        "cost": 180000,
        "profit": 120000
      }
    ],
    "payment_methods": {
      "tunai": {
        "transaction_count": 8,
        "total_amount": 9000000
      },
      "qris": {
        "transaction_count": 5,
        "total_amount": 6000000
      },
      "transfer": {
        "transaction_count": 0,
        "total_amount": 0
      }
    },
    "debt_summary": {
      "total_debt": 50000,
      "total_paid": 20000,
      "total_remaining": 30000
    }
  }
}
```

## 8. HTTP Status Codes

| Code | Status | Description |
|------|--------|-------------|
| `200` | OK | Data analisis penjualan berhasil diambil (format response standar JSON yang diisi data). |
| `400` | Bad Request | Parameter/Format input tidak valid (misalnya `startDate` > `endDate` atau format tanggal salah). |
| `401` | Unauthorized | Bearer Token tidak disisipkan / sudah kedaluwarsa. |
| `403` | Forbidden | User yang terotentikasi tidak memilihi role permission izin `sales_analysis.read`. |

## 9. Catatan Database dan Optimasi & Kinerja
- **Konversi Database (Kinerja):** Pencarian di filter menggunakan batasan indexing Prisma standard. Untuk performa yang lebih optimal jika rentang sangat jauh, dapat dilakukan penambahan index `@@index([created_at])` pada `pesanan` dan `transaksi_keuangan`.
- Saat ini modul menggunakan Node API grouping dan calculation loop sederhana, terfokus hanya pada order berstatus *lunas* (`pesanan.status === 'lunas'`), yang menjaga performa cukup baik pada limit harian / bulanan.
