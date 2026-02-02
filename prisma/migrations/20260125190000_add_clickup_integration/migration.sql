-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN "clickUpEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Workspace" ADD COLUMN "clickUpApiToken" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "clickUpWorkspaceId" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "clickUpListId" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "clickUpClientFieldId" TEXT;
