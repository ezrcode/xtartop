-- CreateTable
CREATE TABLE "AdmCloudTaxGroup" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taxScheduleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmCloudTaxGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdmCloudTaxGroup_workspaceId_idx" ON "AdmCloudTaxGroup"("workspaceId");

-- AddColumn
ALTER TABLE "SubscriptionBilling" ADD COLUMN "admCloudTaxGroupId" TEXT;

-- AddForeignKey
ALTER TABLE "SubscriptionBilling" ADD CONSTRAINT "SubscriptionBilling_admCloudTaxGroupId_fkey" FOREIGN KEY ("admCloudTaxGroupId") REFERENCES "AdmCloudTaxGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmCloudTaxGroup" ADD CONSTRAINT "AdmCloudTaxGroup_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
