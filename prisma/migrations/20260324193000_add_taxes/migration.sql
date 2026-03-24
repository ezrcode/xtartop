-- Create taxes catalog per workspace
CREATE TABLE "Tax" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(65,30) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tax_pkey" PRIMARY KEY ("id")
);

-- Extend quotes with selected tax snapshot and breakdown
ALTER TABLE "Quote"
    ADD COLUMN "taxId" TEXT,
    ADD COLUMN "taxName" TEXT,
    ADD COLUMN "taxRate" DECIMAL(65,30),
    ADD COLUMN "taxAmountOneTime" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "taxAmountMonthly" DECIMAL(65,30) NOT NULL DEFAULT 0;

CREATE INDEX "Tax_workspaceId_idx" ON "Tax"("workspaceId");
CREATE INDEX "Tax_workspaceId_isActive_idx" ON "Tax"("workspaceId", "isActive");
CREATE INDEX "Quote_taxId_idx" ON "Quote"("taxId");

ALTER TABLE "Tax"
    ADD CONSTRAINT "Tax_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Quote"
    ADD CONSTRAINT "Quote_taxId_fkey"
    FOREIGN KEY ("taxId") REFERENCES "Tax"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
