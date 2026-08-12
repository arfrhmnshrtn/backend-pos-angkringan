# Flow POS ke Debt (Hutang)

## Konversi Transaksi POS ke Piutang

1. POS Transaction terjadi (Misal total Rp. 100,000, status = belum_bayar).
2. Jika Pelanggan berhutang seluruhnya: Kasir/Admin hit `POST /api/debts/from-transaction/1` tanpa nominal pembayaran awal. Status Debt menjadi `BELUM_LUNAS`, sisa `100,000`. Pesanan diupdate menjadi `hutang`.
3. Jika Pelanggan membayar sebagian (Rp. 40,000) lalu berhutang (Rp. 60,000): aplikasi memanggil endpoint yang sama dengan `initial_payment_amount = 40000`, `payment_method = transfer`. 
   - Backend memproses pembuatan debt.
   - Sisa hutang dicatat `60,000`, terbayar `40,000`, status `SEBAGIAN`.
   - Backend create `transaksi_keuangan` `pemasukan` sejumlah 40,000.
4. Ketika Pelanggan kembali untuk melunasi Rp. 60,000, panggil `POST /api/debts/:debt_id/payments` dengan `amount = 60000`.
   - Backend memvalidasi `amount = 60000 <= remaining (60000)`.
   - Updating status menjadi `LUNAS`. 
   - Backend otomatis insert Income record baru.
