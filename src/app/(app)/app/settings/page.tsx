import { getWorkspaceWithMembers, getUserWorkspaceRole } from "@/actions/workspace";
import { getWorkspaceUsersWithEmail, getCurrentBillingSenderEmailConfig } from "@/actions/billing-config";
import { getBusinessLines } from "@/actions/business-lines";
import { getExchangeRates } from "@/actions/exchange-rates";
import { getProjectRateReferences } from "@/actions/project-rate-references";
import { SettingsPage } from "@/components/settings/settings-page";
import { redirect } from "next/navigation";

// Settings change infrequently - cache for 2 minutes
export const revalidate = 120;

export default async function Settings() {
    const [workspace, userRole, workspaceUsers, billingSenderEmailConfig, businessLines, exchangeRates, projectRateReferences] = await Promise.all([
        getWorkspaceWithMembers(),
        getUserWorkspaceRole(),
        getWorkspaceUsersWithEmail(),
        getCurrentBillingSenderEmailConfig(),
        getBusinessLines(),
        getExchangeRates(),
        getProjectRateReferences(),
    ]);

    if (!workspace) {
        redirect("/login");
    }

    // Only OWNER and ADMIN can access settings
    if (!userRole || (userRole.role !== 'OWNER' && userRole.role !== 'ADMIN')) {
        redirect("/app");
    }

    return (
        <SettingsPage
            workspace={workspace}
            currentUserRole={userRole.role}
            workspaceUsers={workspaceUsers}
            billingSenderEmailConfig={billingSenderEmailConfig}
            businessLines={businessLines}
            exchangeRates={exchangeRates}
            projectRateReferences={projectRateReferences}
        />
    );
}
