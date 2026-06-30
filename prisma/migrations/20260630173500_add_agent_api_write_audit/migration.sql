ALTER TYPE "ApiKeyScope" ADD VALUE IF NOT EXISTS 'FULL_READ';
ALTER TYPE "ApiKeyScope" ADD VALUE IF NOT EXISTS 'FULL_WRITE';

CREATE TYPE "AgentApiAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

CREATE TABLE "AgentApiAuditLog" (
    "id" TEXT NOT NULL,
    "action" "AgentApiAction" NOT NULL,
    "resource" TEXT NOT NULL,
    "recordId" TEXT,
    "payload" JSONB,
    "workspaceId" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentApiAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgentApiAuditLog_workspaceId_idx" ON "AgentApiAuditLog"("workspaceId");
CREATE INDEX "AgentApiAuditLog_apiKeyId_idx" ON "AgentApiAuditLog"("apiKeyId");
CREATE INDEX "AgentApiAuditLog_resource_recordId_idx" ON "AgentApiAuditLog"("resource", "recordId");
CREATE INDEX "AgentApiAuditLog_createdAt_idx" ON "AgentApiAuditLog"("createdAt");

ALTER TABLE "AgentApiAuditLog" ADD CONSTRAINT "AgentApiAuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentApiAuditLog" ADD CONSTRAINT "AgentApiAuditLog_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "WorkspaceApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentApiAuditLog" ADD CONSTRAINT "AgentApiAuditLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
