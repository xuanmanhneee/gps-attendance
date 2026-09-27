/*
  Warnings:

  - You are about to drop the `user_units` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `unit_id` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "user_units" DROP CONSTRAINT "user_units_unit_id_fkey";

-- DropForeignKey
ALTER TABLE "user_units" DROP CONSTRAINT "user_units_user_id_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "unit_id" INTEGER NOT NULL;

-- DropTable
DROP TABLE "user_units";

-- CreateIndex
CREATE INDEX "users_unit_id_idx" ON "users"("unit_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
