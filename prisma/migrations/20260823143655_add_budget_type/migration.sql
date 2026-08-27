-- CreateEnum
CREATE TYPE "budget_type" AS ENUM ('PERCENTAGE', 'FIXED');

-- AlterTable
ALTER TABLE "budget_allocation" ADD COLUMN     "allocation_type" "budget_type" NOT NULL DEFAULT 'PERCENTAGE',
ADD COLUMN     "fixed_amount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "percentage" SET DEFAULT 0;
