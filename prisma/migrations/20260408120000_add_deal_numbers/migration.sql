-- Add a workspace-scoped correlativo for deals. Historical deals are numbered by creation order.
ALTER TABLE "Deal" ADD COLUMN "number" INTEGER;

WITH numbered_deals AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "workspaceId" ORDER BY "createdAt", "id") + 1000 AS next_number
  FROM "Deal"
)
UPDATE "Deal"
SET "number" = numbered_deals.next_number
FROM numbered_deals
WHERE "Deal"."id" = numbered_deals."id";

ALTER TABLE "Deal" ALTER COLUMN "number" SET NOT NULL;

CREATE UNIQUE INDEX "Deal_workspaceId_number_key" ON "Deal"("workspaceId", "number");
