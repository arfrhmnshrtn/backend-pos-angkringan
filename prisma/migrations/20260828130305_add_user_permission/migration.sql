-- CreateTable
CREATE TABLE "user_permission" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "user_permission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_permission_user_id_idx" ON "user_permission"("user_id");

-- CreateIndex
CREATE INDEX "user_permission_permission_id_idx" ON "user_permission"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_permission_user_id_permission_id_key" ON "user_permission"("user_id", "permission_id");

-- AddForeignKey
ALTER TABLE "user_permission" ADD CONSTRAINT "user_permission_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission" ADD CONSTRAINT "user_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
