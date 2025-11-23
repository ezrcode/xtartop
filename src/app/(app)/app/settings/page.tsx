import { getWorkspaceWithMembers, getUserWorkspaceRole } from "@/actions/workspace";
import { SettingsPage } from "@/components/settings/settings-page";
import { redirect } from "next/navigation";

// Settings change infrequently - cache for 2 minutes
export const revalidate = 120;

export default async function Settings() {
    const [workspace, userRole] = await Promise.all([
        getWorkspaceWithMembers(),
        getUserWorkspaceRole(),
    ]);

    if (!workspace) {
        redirect("/login");
    }

    // Only OWNER and ADMIN can access settings
    if (userRole?.role !== 'OWNER' && userRole?.role !== 'ADMIN') {
        redirect("/app");
    }

    return <SettingsPage workspace={workspace} />;
}

