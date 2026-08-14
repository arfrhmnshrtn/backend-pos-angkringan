-- CreateEnum
CREATE TYPE "waste_type" AS ENUM ('PRODUCT', 'INGREDIENT');

-- CreateEnum
CREATE TYPE "waste_reason" AS ENUM ('BASI', 'KADALUARSA', 'RUSAK', 'GOSONG', 'JATUH', 'SALAH_PRODUKSI', 'SISA_PRODUKSI', 'HILANG', 'LAINNYA');

-- CreateEnum
CREATE TYPE "stock_movement_type" AS ENUM ('IN', 'OUT', 'WASTE', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "ingredient" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "cost_per_unit" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waste" (
    "id" SERIAL NOT NULL,
    "type" "waste_type" NOT NULL,
    "id_katalog_menu" INTEGER,
    "id_ingredient" INTEGER,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "cost_per_unit" INTEGER NOT NULL,
    "total_loss" INTEGER NOT NULL,
    "reason" "waste_reason" NOT NULL,
    "note" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movement" (
    "id" SERIAL NOT NULL,
    "type" "stock_movement_type" NOT NULL,
    "id_katalog_menu" INTEGER,
    "id_ingredient" INTEGER,
    "quantity" INTEGER NOT NULL,
    "stock_before" INTEGER NOT NULL,
    "stock_after" INTEGER NOT NULL,
    "reference_type" TEXT,
    "reference_id" INTEGER,
    "id_waste" INTEGER,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_movement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "waste_type_idx" ON "waste"("type");

-- CreateIndex
CREATE INDEX "waste_reason_idx" ON "waste"("reason");

-- CreateIndex
CREATE INDEX "waste_created_by_idx" ON "waste"("created_by");

-- CreateIndex
CREATE INDEX "waste_created_at_idx" ON "waste"("created_at");

-- CreateIndex
CREATE INDEX "stock_movement_type_idx" ON "stock_movement"("type");

-- CreateIndex
CREATE INDEX "stock_movement_created_at_idx" ON "stock_movement"("created_at");

-- AddForeignKey
ALTER TABLE "waste" ADD CONSTRAINT "waste_id_katalog_menu_fkey" FOREIGN KEY ("id_katalog_menu") REFERENCES "katalog_menu"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste" ADD CONSTRAINT "waste_id_ingredient_fkey" FOREIGN KEY ("id_ingredient") REFERENCES "ingredient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste" ADD CONSTRAINT "waste_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_id_katalog_menu_fkey" FOREIGN KEY ("id_katalog_menu") REFERENCES "katalog_menu"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_id_ingredient_fkey" FOREIGN KEY ("id_ingredient") REFERENCES "ingredient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_id_waste_fkey" FOREIGN KEY ("id_waste") REFERENCES "waste"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
