import { ClickUpClosedTicketsReport } from "@/components/reports/clickup-closed-tickets-report";
import { getCurrentWorkspace } from "@/actions/workspace";

export const dynamic = "force-dynamic";

export default async function CustomerSuccessTicketsReportPage() {
    const workspace = await getCurrentWorkspace();
    return (
        <ClickUpClosedTicketsReport
            workspaceName={workspace?.legalName || workspace?.name || "Workspace"}
            workspaceLogoUrl={workspace?.logoUrl || null}
        />
    );
}
