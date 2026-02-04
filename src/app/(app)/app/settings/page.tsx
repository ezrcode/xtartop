import { getWorkspaceWithMembers, getUserWorkspaceRole } from "@/actions/workspace";
import { getWorkspaceUsersWithEmail } from "@/actions/billing-config";
import { SettingsPage } from "@/components/settings/settings-page";
import { redirect } from "next/navigation";

// Settings change infrequently - cache for 2 minutes
export const revalidate = 120;

export default async function Settings() {
    const [workspace, userRole, workspaceUsers] = await Promise.all([
        getWorkspaceWithMembers(),
        getUserWorkspaceRole(),
        getWorkspaceUsersWithEmail(),
    ]);

    if (!workspace) {
        redirect("/login");
    }

    // Only OWNER and ADMIN can access settings
    if (userRole?.role !== 'OWNER' && userRole?.role !== 'ADMIN') {
        redirect("/app");
    }

    return <SettingsPage workspace={workspace} workspaceUsers={workspaceUsers} />;
}

