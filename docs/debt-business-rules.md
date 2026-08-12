# Debt Business Rules

1. **Full Payment**: Jika `paymentAmount == remainingAmount`, status otomatis menjadi `LUNAS` dan sisa `0`.
2. **Partial Payment**: Jika `paymentAmount < remainingAmount`, status menjadi `SEBAGIAN`. Sisa hutang berkurang sesuai jumlah nominal.
3. **Overpayment Protection**: Backend menolak jika `paymentAmount > remainingAmount` (HTTP 400). Pembayaran tidak boleh melampaui hutang.
4. **Cannot Pay Cancelled/Paid Debt**: Tidak bisa mencatatkan payment ke debt yang berstatus `LUNAS` atau `DIBATALKAN`.
5. **No Double Counting**: `debt_payment` otomatis trigger ke table `transaksi_keuangan`. Tidak perlu input ulang.
6. **Concurrency Protection**: Pembayaran dilakukan dalam blok `prisma.$transaction()` agar validasi sisa hutang dan pembayaran dijamin atomik sesuai dengan MVCC PostgreSQL.
7. **Cancel Operation**: Hanya mengubah status target menjadi `DIBATALKAN`. Financial records (`transaksi_keuangan`) sengaja tidak dihapus/di-cascade untuk menjaga jejak histori audit.
