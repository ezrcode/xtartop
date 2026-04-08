-- Create enums for deal commissions
CREATE TYPE "CommissionRole" AS ENUM ('MARKETING', 'COMERCIAL', 'TECNICO', 'FUNCIONAL', 'ADMINISTRATIVO');
CREATE TYPE "CommissionValueType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');
CREATE TYPE "DealCommissionStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateTable
CREATE TABLE "DealCommission" (
    "id" TEXT NOT NULL,
    "status" "DealCommissionStatus" NOT NULL DEFAULT 'ACTIVE',
    "commissionableBase" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,
    "dealId" TEXT NOT NULL,
    "approvedQuoteId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealCommissionEntry" (
    "id" TEXT NOT NULL,
    "role" "CommissionRole" NOT NULL,
    "type" "CommissionValueType" NOT NULL,
    "percentage" DECIMAL(65,30),
    "fixedAmount" DECIMAL(65,30),
    "calculatedAmount" DECIMAL(65,30) NOT NULL,
    "dealCommissionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealCommissionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DealCommission_approvedQuoteId_key" ON "DealCommission"("approvedQuoteId");

-- CreateIndex
CREATE INDEX "DealCommission_dealId_idx" ON "DealCommission"("dealId");

-- CreateIndex
CREATE INDEX "DealCommissionEntry_dealCommissionId_idx" ON "DealCommissionEntry"("dealCommissionId");

-- CreateIndex
CREATE INDEX "DealCommissionEntry_userId_idx" ON "DealCommissionEntry"("userId");

-- AddForeignKey
ALTER TABLE "DealCommission" ADD CONSTRAINT "DealCommission_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DealCommission" ADD CONSTRAINT "DealCommission_approvedQuoteId_fkey" FOREIGN KEY ("approvedQuoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DealCommission" ADD CONSTRAINT "DealCommission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DealCommission" ADD CONSTRAINT "DealCommission_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealCommissionEntry" ADD CONSTRAINT "DealCommissionEntry_dealCommissionId_fkey" FOREIGN KEY ("dealCommissionId") REFERENCES "DealCommission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DealCommissionEntry" ADD CONSTRAINT "DealCommissionEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
