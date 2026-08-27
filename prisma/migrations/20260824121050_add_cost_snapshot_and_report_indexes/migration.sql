-- AlterTable
ALTER TABLE "detail_pesanan" ADD COLUMN     "harga_modal" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "debt_payment_paid_at_idx" ON "debt_payment"("paid_at");

-- CreateIndex
CREATE INDEX "debt_payment_id_debt_idx" ON "debt_payment"("id_debt");

-- CreateIndex
CREATE INDEX "detail_pesanan_id_pesanan_idx" ON "detail_pesanan"("id_pesanan");

-- CreateIndex
CREATE INDEX "pesanan_status_created_at_idx" ON "pesanan"("status", "created_at");

-- CreateIndex
CREATE INDEX "pesanan_created_at_idx" ON "pesanan"("created_at");
