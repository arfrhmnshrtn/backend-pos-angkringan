-- CreateEnum
CREATE TYPE "debt_type" AS ENUM ('CUSTOMER', 'SUPPLIER');

-- CreateEnum
CREATE TYPE "debt_status" AS ENUM ('BELUM_LUNAS', 'SEBAGIAN', 'LUNAS', 'DIBATALKAN');

-- CreateTable
CREATE TABLE "debt" (
    "id" SERIAL NOT NULL,
    "type" "debt_type" NOT NULL,
    "customer_name" TEXT,
    "supplier_name" TEXT,
    "note" TEXT,
    "total_amount" INTEGER NOT NULL,
    "paid_amount" INTEGER NOT NULL DEFAULT 0,
    "remaining_amount" INTEGER NOT NULL,
    "status" "debt_status" NOT NULL DEFAULT 'BELUM_LUNAS',
    "id_pesanan" INTEGER,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "debt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debt_payment" (
    "id" SERIAL NOT NULL,
    "id_debt" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "payment_method" "metode_pembayaran" NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_user" INTEGER NOT NULL,
    "id_transaksi_keuangan" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "debt_payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "debt_id_pesanan_key" ON "debt"("id_pesanan");

-- CreateIndex
CREATE UNIQUE INDEX "debt_payment_id_transaksi_keuangan_key" ON "debt_payment"("id_transaksi_keuangan");

-- AddForeignKey
ALTER TABLE "debt" ADD CONSTRAINT "debt_id_pesanan_fkey" FOREIGN KEY ("id_pesanan") REFERENCES "pesanan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt" ADD CONSTRAINT "debt_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_payment" ADD CONSTRAINT "debt_payment_id_debt_fkey" FOREIGN KEY ("id_debt") REFERENCES "debt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_payment" ADD CONSTRAINT "debt_payment_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_payment" ADD CONSTRAINT "debt_payment_id_transaksi_keuangan_fkey" FOREIGN KEY ("id_transaksi_keuangan") REFERENCES "transaksi_keuangan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
