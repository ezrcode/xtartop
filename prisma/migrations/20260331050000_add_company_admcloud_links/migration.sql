-- CreateTable
CREATE TABLE "CompanyAdmCloudLink" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "admCloudRelationshipId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fiscalId" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyAdmCloudLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyAdmCloudLink_companyId_idx" ON "CompanyAdmCloudLink"("companyId");

-- AddForeignKey
ALTER TABLE "CompanyAdmCloudLink" ADD CONSTRAINT "CompanyAdmCloudLink_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing data: create a link for each company that has an admCloudRelationshipId
INSERT INTO "CompanyAdmCloudLink" ("id", "companyId", "admCloudRelationshipId", "name", "isPrimary", "createdAt")
SELECT
    gen_random_uuid()::text,
    c."id",
    c."admCloudRelationshipId",
    c."name",
    true,
    COALESCE(c."admCloudLastSync", NOW())
FROM "Company" c
WHERE c."admCloudRelationshipId" IS NOT NULL;
