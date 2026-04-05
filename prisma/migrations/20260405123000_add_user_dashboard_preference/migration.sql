CREATE TYPE "UserDashboardPreference" AS ENUM ('ALL', 'CEO', 'CFO', 'CUSTOMER_SUCCESS');

ALTER TABLE "User"
ADD COLUMN "dashboardPreference" "UserDashboardPreference" NOT NULL DEFAULT 'ALL';
