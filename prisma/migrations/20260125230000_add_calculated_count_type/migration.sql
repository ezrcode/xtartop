-- CreateEnum
CREATE TYPE "CalculatedBase" AS ENUM ('PROJECTS', 'USERS');

-- AlterEnum
ALTER TYPE "CountType" ADD VALUE 'CALCULATED';

-- AlterTable
ALTER TABLE "SubscriptionItem" ADD COLUMN "calculatedBase" "CalculatedBase";
ALTER TABLE "SubscriptionItem" ADD COLUMN "calculatedSubtract" INTEGER;
