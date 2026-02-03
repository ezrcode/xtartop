-- Update existing users with SYSTEM theme to LIGHT
UPDATE "User" SET "themePreference" = 'LIGHT' WHERE "themePreference" = 'SYSTEM';

-- Change default value for new users
ALTER TABLE "User" ALTER COLUMN "themePreference" SET DEFAULT 'LIGHT';
