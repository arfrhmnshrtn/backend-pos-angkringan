# Debt Database Documentation 

## 1. Table `debt`
| Column | Type | Description | Relasi |
|--------|------|-------------|--------|
| `id` | Int | PK | |
| `type` | debt_type | CUSTOMER atau SUPPLIER | |
| `customer_name` | String? | Nama kustom klien, nullable jika terisi pesanan_id | |
| `supplier_name` | String? | Boleh nul jika piutang pelanggan | | 
| `total_amount` | Int | Total piutang / utang awal | |
| `paid_amount` | Int | Jumlah akumulasi terbayar saat ini | default: 0 |
| `remaining_amount`| Int | Sisa yang belum terbayar | harus: total - paid |
| `status` | debt_status | BELUM_LUNAS/SEBAGIAN/LUNAS/DIBATALKAN | |
| `id_pesanan` | Int? | Relasi UNIQUE ke tabel `pesanan` POS | pesanan.id |
| `created_by` | Int | Relasi ke `user` sistem (kasir / id owner) | user.id |

## 2. Table `debt_payment`
| Column | Type | Description | Relasi |
|--------|------|-------------|--------|
| `id` | Int | PK | |
| `id_debt` | Int | Relasi ke table `debt` dengan Cascade | debt.id |
| `amount` | Int | Nilai transaksi tersebut | |
| `payment_method` | metode_pembayaran | Enum: tunai/qris/transfer | |
| `id_user` | Int | Relasi user yang menerima/membayar | user.id |
| `id_transaksi_keuangan` | Int? | UNIQUE relasi histori `transaksi_keuangan` agar audit sinkron | transaksi_keuangan.id |

Index digunakan untuk type dan status agar mempercepat filter default aplikasi. Cascade dipasang pada `id_debt` => `debt_payment` namun payment record sangat tidak disarankan untuk dihard-delete pada level aplikasi, lebih baik dibatalkan.
