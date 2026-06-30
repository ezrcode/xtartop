CREATE TYPE "ApiKeyScope" AS ENUM ('FULL_ACCESS');

CREATE TABLE "WorkspaceApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "scope" "ApiKeyScope" NOT NULL DEFAULT 'FULL_ACCESS',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceApiKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceApiKey_keyHash_key" ON "WorkspaceApiKey"("keyHash");
CREATE INDEX "WorkspaceApiKey_workspaceId_idx" ON "WorkspaceApiKey"("workspaceId");
CREATE INDEX "WorkspaceApiKey_keyHash_idx" ON "WorkspaceApiKey"("keyHash");
CREATE INDEX "WorkspaceApiKey_workspaceId_isActive_idx" ON "WorkspaceApiKey"("workspaceId", "isActive");

ALTER TABLE "WorkspaceApiKey" ADD CONSTRAINT "WorkspaceApiKey_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceApiKey" ADD CONSTRAINT "WorkspaceApiKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
