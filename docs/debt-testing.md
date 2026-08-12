# Testing Modul Piutang/Hutang

Terdapat test (Jest) di dalam `src/debt/services/debt.service.spec.ts`

**Test yang sudah tercover:**
1. Create Piutang / Hutang manual
   - Membuat rekaman status awal `BELUM_LUNAS`, sisa == total.
2. Hit endpoint summary (unit dan query tested).
3. Find detil hutang (berhasil dan gagal bila tidak ketemu).
4. Create Payment API:
   - Tes mengesahkan relasi perhitungan `remaining_amount -= amount`.
   - Menolak overpayment `amount > remaining_amount`.
5. Batal (Cancel Debt):
   - Menerima mutasi `status` = 'DIBATALKAN'.
   - Gagal bila `pesanan` hutang terkait sudah `LUNAS`.
6. Konversi Pesanan (`convertTransactionToDebt`):
   - Mencegah dupilkat, cek bahwa `id_pesanan` unique.
   - Pendaftaran piutang valid disinkronkan dengan status POS = `hutang`.

Cara eksekusi test: `npm run test`
