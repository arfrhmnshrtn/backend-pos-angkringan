# Dummy Data Seed - POS Angkringan

Sistem seed untuk menghasilkan dataset testing besar dan realistis.

## Quick Start

```bash
# 1. Pastikan database dan master data sudah di-setup
npm run seed

# 2. Generate 100.000 pesanan (RESET mode - hapus data lama)
npm run seed:reset

# 3. Atau tambahkan data tanpa menghapus (APPEND mode)
npm run seed:append
```

## Perintah

| Command | Mode | Deskripsi |
|---------|------|-----------|
| `npm run seed` | Master | Seed permissions, roles, dan owner (existing) |
| `npm run seed:reset` | Reset | Hapus data transactional → generate dataset baru |
| `npm run seed:append` | Append | Tambahkan dataset baru tanpa menghapus |

## Environment Variables

| Variable | Default | Deskripsi |
|----------|---------|-----------|
| `SEED_MODE` | `append` | Mode seed: `reset` atau `append` |
| `SEED_ORDERS` | `100000` | Jumlah pesanan yang di-generate |
| `SEED_START_DATE` | `2025-08-01` | Tanggal awal rentang data |
| `SEED_END_DATE` | `2026-08-30` | Tanggal akhir rentang data |
| `SEED_RANDOM` | `12345` | Random seed untuk reproducibility |
| `SEED_BATCH_SIZE` | `2000` | Ukuran batch untuk bulk insert |
| `SEED_EXPENSES` | `2500` | Jumlah record pengeluaran |
| `SEED_WASTES` | `1500` | Jumlah record waste |
| `NODE_ENV` | - | Jika `production`, mode reset diblokir |
| `ALLOW_DESTRUCTIVE_SEED` | `false` | Set `true` untuk izinkan reset di production |

## Dataset yang dihasilkan

### Target Utama
- **±100.000 pesanan** dengan detail pesanan
- Rentang: 1 Agustus 2025 – 30 Agustus 2026

### Model yang di-seed

| Model | Estimasi Jumlah | Deskripsi |
|-------|-----------------|-----------|
| `katalog_menu` | 35 | Produk menu angkringan |
| `ingredient` | 10 | Bahan baku |
| `pesanan` | 100.000 | Pesanan POS |
| `detail_pesanan` | ~250.000 | Detail item per pesanan |
| `transaksi_keuangan` | ~95.000+ | Income POS + pembayaran hutang + pengeluaran |
| `debt` | ~8.050 | Hutang customer (dari POS) + supplier |
| `debt_payment` | ~6.000+ | Pembayaran hutang |
| `waste` | 1.500 | Barang terbuang |
| `budget_allocation` | 6 | Alokasi budget |
| `kategori_keuangan` | 14+ | Kategori income & expense |

### Data yang TIDAK dihapus saat Reset
- `user` (termasuk owner)
- `permission`
- `role_permission`
- `refresh_token`
- `katalog_menu` (dipertahankan, bisa reuse)

## Distribusi Data

### Pola Hari (Senin-Minggu)
- **Senin**: Rendah (~70%)
- **Selasa-Kamis**: Normal (~85-90%)
- **Jumat**: Tinggi (~120%)
- **Sabtu**: Peak (~135%)
- **Minggu**: Cukup tinggi (~110%)

### Pola Jam Operasional
- **16:00-18:00**: Mulai buka, rendah
- **18:00-20:00**: Tinggi
- **20:00-22:00**: Peak hour
- **22:00-00:00**: Menurun
- **00:00-02:00**: Rendah, menjelang tutup

### Pola Bulanan
- Variasi musiman (Ramadan lebih sepi, Desember lebih ramai)
- Jitter random ±20% per hari
- 2% chance hari sangat sepi
- 3% chance hari sangat ramai

### Status Pesanan
- **Lunas**: 88%
- **Hutang**: 8%
- **Belum Bayar**: 4%

### Metode Pembayaran (Lunas)
- **Tunai**: 55%
- **QRIS**: 35%
- **Transfer**: 10%

### Popularitas Produk
- Produk sangat populer: Sate Kulit, Es Teh Manis, Nasi Kucing
- Produk jarang: Sate Lidah, Wedang Uwuh, Nasi Bakar Spesial
- Distribusi weighted memastikan ranking realistis

### Status Hutang
- **Belum Lunas**: 30%
- **Sebagian**: 30%
- **Lunas**: 35%
- **Dibatalkan**: 5%

## Struktur File

```
prisma/
├── seed.ts              # Existing master seeder
├── seed/
│   ├── runner.ts        # Main entry point
│   ├── config.ts        # Konfigurasi & data master
│   ├── generators.ts    # Generator untuk semua model
│   ├── utils.ts         # Utilities (PRNG, dates, progress)
│   └── validators.ts    # Validasi post-seed
```

## Validasi

Setelah seed selesai, validator otomatis memeriksa:

1. **Record Count** - Jumlah pesanan ≈ target
2. **Orphan Records** - Tidak ada FK invalid
3. **Financial Consistency** - Revenue, income, expense
4. **Debt Integrity** - `remaining = total - paid`
5. **Duplicate Check** - Tidak ada nomor_pesanan/nomor_transaksi duplikat
6. **Distribution** - Status, payment methods, top products

## Reproducibility

Dengan random seed yang sama (`SEED_RANDOM=12345`), dataset yang dihasilkan akan identik. Ini penting untuk:
- Konsistensi testing
- Debugging
- Benchmark perbandingan

Ubah random seed untuk variasi:
```bash
SEED_RANDOM=99999 npm run seed:reset
```

## Performance

- Menggunakan `createMany()` dan `createManyAndReturn()` untuk bulk insert
- Batch processing (default 2.000 records/batch)
- Data master di-cache di memory (tidak N+1 query)
- Estimasi waktu: 3-15 menit tergantung spesifikasi server

## Mengubah Jumlah Data

```bash
# 50.000 pesanan (lebih cepat)
SEED_ORDERS=50000 npm run seed:reset

# 200.000 pesanan (lebih banyak)
SEED_ORDERS=200000 npm run seed:reset

# Custom date range
SEED_START_DATE=2026-01-01 SEED_END_DATE=2026-06-30 SEED_ORDERS=50000 npm run seed:reset
```

## Troubleshooting

### "Cannot connect to database"
Pastikan `DATABASE_URL` di `.env` sudah benar.

### "Out of memory"
Kurangi `SEED_BATCH_SIZE`:
```bash
SEED_BATCH_SIZE=500 npm run seed:reset
```

### "Unique constraint violation"
Mode reset menghapus data lama terlebih dahulu. Jika mode append, pastikan tidak ada konflik nomor pesanan.

### "SEED RESET BLOCKED"
Ini safety check untuk production. Set `NODE_ENV` ke selain `production`, atau set `ALLOW_DESTRUCTIVE_SEED=true`.

### Seed terlalu lama
- Kurangi jumlah data: `SEED_ORDERS=10000`
- Pastikan database memiliki koneksi yang stabil
- Cek apakah ada index yang belum dibuat

## Warning Produksi

> ⚠️ **JANGAN** jalankan `seed:reset` di database production tanpa safeguard.
> Mode reset **menghapus semua data transactional**.
> Gunakan `ALLOW_DESTRUCTIVE_SEED=true` hanya jika Anda benar-benar yakin.
