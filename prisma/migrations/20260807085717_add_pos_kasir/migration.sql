-- CreateEnum
CREATE TYPE "status_pesanan" AS ENUM ('belum_bayar', 'lunas', 'hutang');

-- CreateEnum
CREATE TYPE "metode_pembayaran" AS ENUM ('tunai', 'qris', 'transfer');

-- AlterTable
ALTER TABLE "katalog_menu" ALTER COLUMN "url_gambar" DROP NOT NULL;

-- CreateTable
CREATE TABLE "pesanan" (
    "id" SERIAL NOT NULL,
    "nomor_pesanan" TEXT NOT NULL,
    "nama_pelanggan" TEXT,
    "total_item" INTEGER NOT NULL,
    "total_harga" INTEGER NOT NULL,
    "metode_pembayaran" "metode_pembayaran",
    "status" "status_pesanan" NOT NULL DEFAULT 'belum_bayar',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pesanan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detail_pesanan" (
    "id" SERIAL NOT NULL,
    "id_pesanan" INTEGER NOT NULL,
    "id_menu" INTEGER NOT NULL,
    "nama_menu" TEXT NOT NULL,
    "harga" INTEGER NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "detail_pesanan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pesanan_nomor_pesanan_key" ON "pesanan"("nomor_pesanan");

-- AddForeignKey
ALTER TABLE "detail_pesanan" ADD CONSTRAINT "detail_pesanan_id_pesanan_fkey" FOREIGN KEY ("id_pesanan") REFERENCES "pesanan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detail_pesanan" ADD CONSTRAINT "detail_pesanan_id_menu_fkey" FOREIGN KEY ("id_menu") REFERENCES "katalog_menu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
