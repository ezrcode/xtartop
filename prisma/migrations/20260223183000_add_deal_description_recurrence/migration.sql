-- CreateEnum
CREATE TYPE "DealRecurrence" AS ENUM ('ONETIME_PROJECT', 'SUSCRIPCION');

-- AlterTable
ALTER TABLE "Deal"
ADD COLUMN "description" TEXT,
ADD COLUMN "recurrence" "DealRecurrence" NOT NULL DEFAULT 'ONETIME_PROJECT';
