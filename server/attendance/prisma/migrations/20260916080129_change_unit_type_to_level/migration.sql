/*
  Warnings:

  - You are about to drop the column `type` on the `units` table. All the data in the column will be lost.
  - You are about to drop the column `account_id` on the `users` table. All the data in the column will be lost.
  - Added the required column `level` to the `units` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "users_account_id_key";

-- AlterTable
ALTER TABLE "accounts" ALTER COLUMN "status" SET DEFAULT 'active';

-- AlterTable
ALTER TABLE "units" DROP COLUMN "type",
ADD COLUMN     "level" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "account_id";

-- DropEnum
DROP TYPE "UnitType";

-- CreateIndex
CREATE INDEX "units_level_idx" ON "units"("level");
