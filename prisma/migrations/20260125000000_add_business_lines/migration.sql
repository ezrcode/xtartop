-- CreateTable
CREATE TABLE "BusinessLine" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessLine_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN "businessLineId" TEXT;

-- CreateIndex
CREATE INDEX "BusinessLine_workspaceId_idx" ON "BusinessLine"("workspaceId");

-- CreateIndex
CREATE INDEX "Deal_businessLineId_idx" ON "Deal"("businessLineId");

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_businessLineId_fkey" FOREIGN KEY ("businessLineId") REFERENCES "BusinessLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessLine" ADD CONSTRAINT "BusinessLine_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
