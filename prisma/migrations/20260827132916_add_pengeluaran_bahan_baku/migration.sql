-- CreateTable
CREATE TABLE "pengeluaran_bahan_baku" (
    "id" SERIAL NOT NULL,
    "nama_item" TEXT NOT NULL,
    "jumlah" DOUBLE PRECISION NOT NULL,
    "satuan" TEXT NOT NULL,
    "harga_satuan" INTEGER NOT NULL,
    "total_harga" INTEGER NOT NULL,
    "catatan" TEXT,
    "id_transaksi_keuangan" INTEGER NOT NULL,
    "created_by" INTEGER NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pengeluaran_bahan_baku_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pengeluaran_bahan_baku_id_transaksi_keuangan_key" ON "pengeluaran_bahan_baku"("id_transaksi_keuangan");

-- CreateIndex
CREATE INDEX "pengeluaran_bahan_baku_created_by_idx" ON "pengeluaran_bahan_baku"("created_by");

-- CreateIndex
CREATE INDEX "pengeluaran_bahan_baku_tanggal_idx" ON "pengeluaran_bahan_baku"("tanggal");

-- AddForeignKey
ALTER TABLE "pengeluaran_bahan_baku" ADD CONSTRAINT "pengeluaran_bahan_baku_id_transaksi_keuangan_fkey" FOREIGN KEY ("id_transaksi_keuangan") REFERENCES "transaksi_keuangan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengeluaran_bahan_baku" ADD CONSTRAINT "pengeluaran_bahan_baku_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
