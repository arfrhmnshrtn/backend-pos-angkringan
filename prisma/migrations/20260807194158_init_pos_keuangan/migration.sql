-- CreateEnum
CREATE TYPE "jenis_transaksi" AS ENUM ('pemasukan', 'pengeluaran');

-- CreateTable
CREATE TABLE "kategori_keuangan" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "jenis" "jenis_transaksi" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kategori_keuangan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaksi_keuangan" (
    "id" SERIAL NOT NULL,
    "nomor_transaksi" TEXT NOT NULL,
    "jenis" "jenis_transaksi" NOT NULL,
    "id_kategori" INTEGER NOT NULL,
    "nominal" INTEGER NOT NULL,
    "metode_pembayaran" "metode_pembayaran",
    "keterangan" TEXT NOT NULL,
    "id_pesanan" INTEGER,
    "id_user" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaksi_keuangan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kategori_keuangan_nama_key" ON "kategori_keuangan"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "transaksi_keuangan_nomor_transaksi_key" ON "transaksi_keuangan"("nomor_transaksi");

-- AddForeignKey
ALTER TABLE "transaksi_keuangan" ADD CONSTRAINT "transaksi_keuangan_id_kategori_fkey" FOREIGN KEY ("id_kategori") REFERENCES "kategori_keuangan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaksi_keuangan" ADD CONSTRAINT "transaksi_keuangan_id_pesanan_fkey" FOREIGN KEY ("id_pesanan") REFERENCES "pesanan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaksi_keuangan" ADD CONSTRAINT "transaksi_keuangan_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
