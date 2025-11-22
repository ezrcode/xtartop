-- CreateEnum
CREATE TYPE "DealViewPreference" AS ENUM ('TABLE', 'KANBAN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dealsViewPref" "DealViewPreference" NOT NULL DEFAULT 'TABLE',
ADD COLUMN     "photoUrl" TEXT;
