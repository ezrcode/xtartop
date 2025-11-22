/*
  Warnings:

  - Added the required column `createdById` to the `Company` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('PROSPECTO', 'POTENCIAL', 'CLIENTE', 'DESCARTADA', 'INACTIVA');

-- CreateEnum
CREATE TYPE "CompanyOrigin" AS ENUM ('PROSPECCION_MANUAL', 'REFERIDO_CLIENTE', 'REFERIDO_ALIADO', 'INBOUND_MARKETING', 'OUTBOUND_MARKETING', 'EVENTO_PRESENCIAL');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "instagramUrl" TEXT,
ADD COLUMN     "linkedinUrl" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "origin" "CompanyOrigin",
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "primaryContactId" TEXT,
ADD COLUMN     "status" "CompanyStatus" NOT NULL DEFAULT 'PROSPECTO',
ADD COLUMN     "taxId" TEXT;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
