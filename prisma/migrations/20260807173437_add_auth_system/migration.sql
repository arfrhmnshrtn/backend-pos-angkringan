-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('OWNER', 'KASIR');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "fullname" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "status" "user_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permission" (
    "id" SERIAL NOT NULL,
    "role" "user_role" NOT NULL,
    "permission_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_token" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expired_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_role_idx" ON "user"("role");

-- CreateIndex
CREATE INDEX "user_status_idx" ON "user"("status");

-- CreateIndex
CREATE INDEX "user_deleted_at_idx" ON "user"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "permission_name_key" ON "permission"("name");

-- CreateIndex
CREATE INDEX "role_permission_role_idx" ON "role_permission"("role");

-- CreateIndex
CREATE INDEX "role_permission_permission_id_idx" ON "role_permission"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permission_role_permission_id_key" ON "role_permission"("role", "permission_id");

-- CreateIndex
CREATE INDEX "refresh_token_user_id_idx" ON "refresh_token"("user_id");

-- CreateIndex
CREATE INDEX "refresh_token_expired_at_idx" ON "refresh_token"("expired_at");

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
