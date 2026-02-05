-- AlterTable
ALTER TABLE "SubscriptionBilling" ADD COLUMN IF NOT EXISTS "autoBillingEnabled" BOOLEAN NOT NULL DEFAULT false;
