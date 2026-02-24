-- CreateEnum
CREATE TYPE "ProjectRateUnit" AS ENUM ('POR_HORA', 'POR_PROYECTO', 'PAQUETE');

-- CreateTable
CREATE TABLE "ProjectRateReference" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "unit" "ProjectRateUnit" NOT NULL DEFAULT 'POR_HORA',
    "hourlyRate" DECIMAL(65,30),
    "referenceHours" INTEGER,
    "fixedPrice" DECIMAL(65,30),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectRateReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectRateReference_workspaceId_idx" ON "ProjectRateReference"("workspaceId");

-- CreateIndex
CREATE INDEX "ProjectRateReference_workspaceId_isActive_idx" ON "ProjectRateReference"("workspaceId", "isActive");

-- AddForeignKey
ALTER TABLE "ProjectRateReference" ADD CONSTRAINT "ProjectRateReference_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
