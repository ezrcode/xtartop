-- CreateEnum
CREATE TYPE "DealType" AS ENUM ('CLIENTE_NUEVO', 'UPSELLING');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('PROSPECCION', 'CALIFICACION', 'NEGOCIACION', 'FORMALIZACION', 'CIERRE_GANADO', 'CIERRE_PERDIDO', 'NO_CALIFICADOS');

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "mrr" DECIMAL(65,30),
    "arr" DECIMAL(65,30),
    "type" "DealType",
    "status" "DealStatus" NOT NULL DEFAULT 'PROSPECCION',
    "companyId" TEXT,
    "contactId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
