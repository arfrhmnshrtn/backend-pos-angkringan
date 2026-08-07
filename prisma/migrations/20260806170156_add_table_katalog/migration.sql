-- CreateEnum
CREATE TYPE "kategori" AS ENUM ('bakaran', 'jajanan', 'minuman', 'makanan');

-- CreateTable
CREATE TABLE "katalog_menu" (
    "id" SERIAL NOT NULL,
    "nama_item" TEXT NOT NULL,
    "kategori" "kategori" NOT NULL,
    "stok" INTEGER NOT NULL,
    "harga_modal" INTEGER NOT NULL,
    "harga_jual" INTEGER NOT NULL,
    "url_gambar" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "katalog_menu_pkey" PRIMARY KEY ("id")
);
