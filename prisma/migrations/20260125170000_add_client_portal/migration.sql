-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('INTERNAL', 'CLIENT');

-- AlterTable: Add userType and contactId to User
ALTER TABLE "User" ADD COLUMN "userType" "UserType" NOT NULL DEFAULT 'INTERNAL';
ALTER TABLE "User" ADD COLUMN "contactId" TEXT;

-- AlterTable: Add new fields to Company
ALTER TABLE "Company" ADD COLUMN "legalName" TEXT;
ALTER TABLE "Company" ADD COLUMN "fiscalAddress" TEXT;
ALTER TABLE "Company" ADD COLUMN "termsAccepted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Company" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "Company" ADD COLUMN "termsAcceptedById" TEXT;
ALTER TABLE "Company" ADD COLUMN "termsAcceptedByName" TEXT;
ALTER TABLE "Company" ADD COLUMN "termsVersion" TEXT;

-- CreateTable: ClientInvitation
CREATE TABLE "ClientInvitation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "ClientInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_contactId_key" ON "User"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientInvitation_token_key" ON "ClientInvitation"("token");

-- CreateIndex
CREATE INDEX "ClientInvitation_token_idx" ON "ClientInvitation"("token");

-- CreateIndex
CREATE INDEX "ClientInvitation_companyId_idx" ON "ClientInvitation"("companyId");

-- CreateIndex
CREATE INDEX "ClientInvitation_contactId_idx" ON "ClientInvitation"("contactId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientInvitation" ADD CONSTRAINT "ClientInvitation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientInvitation" ADD CONSTRAINT "ClientInvitation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
