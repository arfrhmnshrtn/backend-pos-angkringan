-- CreateTable
CREATE TABLE "cash_balance" (
    "id" SERIAL NOT NULL,
    "payment_method" "metode_pembayaran" NOT NULL,
    "amount" INTEGER NOT NULL,
    "effective_date" DATE NOT NULL,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_balance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_allocation" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "percentage" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_allocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cash_balance_payment_method_effective_date_key" ON "cash_balance"("payment_method", "effective_date");

-- AddForeignKey
ALTER TABLE "cash_balance" ADD CONSTRAINT "cash_balance_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_allocation" ADD CONSTRAINT "budget_allocation_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
