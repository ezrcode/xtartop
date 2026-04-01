-- CreateEnum: CompanyType
CREATE TYPE "CompanyType" AS ENUM ('PROSPECTO', 'POTENCIAL', 'CLIENTE_SUSCRIPTOR', 'CLIENTE_ONETIME', 'PROVEEDOR', 'INVERSIONISTA', 'COMPETIDOR', 'NO_CALIFICA', 'NO_RESPONDIO', 'DESISTIO', 'RESCINDIO_CONTRATO', 'SIN_MOTIVO');

-- Add type column with default
ALTER TABLE "Company" ADD COLUMN "type" "CompanyType" NOT NULL DEFAULT 'PROSPECTO';

-- Migrate existing data: map old status values to new type
UPDATE "Company" SET "type" = 'CLIENTE_SUSCRIPTOR' WHERE "status" = 'CLIENTE';
UPDATE "Company" SET "type" = 'PROSPECTO' WHERE "status" = 'PROSPECTO';
UPDATE "Company" SET "type" = 'POTENCIAL' WHERE "status" = 'POTENCIAL';
UPDATE "Company" SET "type" = 'PROVEEDOR' WHERE "status" = 'PROVEEDOR';
UPDATE "Company" SET "type" = 'SIN_MOTIVO' WHERE "status" = 'INACTIVA';
UPDATE "Company" SET "type" = 'NO_CALIFICA' WHERE "status" = 'DESCARTADA';

-- Map old status to new binary status via a temp column
ALTER TABLE "Company" ADD COLUMN "new_status" TEXT;
UPDATE "Company" SET "new_status" = 'ACTIVO' WHERE "status" IN ('PROSPECTO', 'POTENCIAL', 'CLIENTE', 'PROVEEDOR');
UPDATE "Company" SET "new_status" = 'INACTIVO' WHERE "status" IN ('INACTIVA', 'DESCARTADA');
-- Catch any unmapped
UPDATE "Company" SET "new_status" = 'ACTIVO' WHERE "new_status" IS NULL;

-- Drop old status column and rename
ALTER TABLE "Company" DROP COLUMN "status";
ALTER TABLE "Company" RENAME COLUMN "new_status" TO "status_text";

-- Drop old enum
DROP TYPE "CompanyStatus";

-- Create new enum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVO', 'INACTIVO');

-- Add final status column with proper type
ALTER TABLE "Company" ADD COLUMN "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVO';
UPDATE "Company" SET "status" = "status_text"::"CompanyStatus";
ALTER TABLE "Company" DROP COLUMN "status_text";

-- Add new ActivityType values
ALTER TYPE "ActivityType" ADD VALUE 'STATUS_CHANGE';
ALTER TYPE "ActivityType" ADD VALUE 'TYPE_CHANGE';
