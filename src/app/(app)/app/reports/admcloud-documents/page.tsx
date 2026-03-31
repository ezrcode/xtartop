import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/actions/workspace";
import { prisma } from "@/lib/prisma";
import { createAdmCloudClient } from "@/lib/admcloud/client";
import { AdmCloudDocumentsReport } from "@/components/reports/admcloud-documents-report";

export const dynamic = "force-dynamic";

async function getItemsList(workspaceId: string) {
    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: {
            admCloudEnabled: true,
            admCloudAppId: true,
            admCloudUsername: true,
            admCloudPassword: true,
            admCloudCompany: true,
            admCloudRole: true,
        },
    });

    if (!workspace?.admCloudEnabled || !workspace.admCloudAppId || !workspace.admCloudUsername || !workspace.admCloudPassword || !workspace.admCloudCompany) {
        return [];
    }

    try {
        const client = createAdmCloudClient({
            appId: workspace.admCloudAppId,
            username: workspace.admCloudUsername,
            password: workspace.admCloudPassword,
            company: workspace.admCloudCompany,
            role: workspace.admCloudRole || "Administradores",
        });

        const result = await client.getPriceLists();
        if (!result.success || !result.data) return [];

        const itemsMap = new Map<string, { id: string; code: string; name: string }>();
        for (const item of result.data) {
            const record = item as Record<string, unknown>;
            const id = String(record.ItemID || record.ID || "");
            const code = String(record.ItemSKU || record.ItemCode || record.Code || "");
            const name = String(record.ItemName || record.Name || record.Description || "");
            if (id && name) {
                itemsMap.set(id, { id, code, name });
            }
        }
        return Array.from(itemsMap.values())
            .filter((i) => i.code.startsWith("S-"))
            .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error("[Reports] Error fetching items:", error);
        return [];
    }
}

export default async function AdmCloudDocumentsPage() {
    const session = await auth();
    if (!session?.user?.email) {
        redirect("/login");
    }

    const workspace = await getCurrentWorkspace();
    if (!workspace) {
        return (
            <div className="min-h-screen bg-[var(--surface-0)] flex items-center justify-center">
                <p className="text-[var(--muted-text)]">Workspace no encontrado</p>
            </div>
        );
    }

    const items = await getItemsList(workspace.id);

    return <AdmCloudDocumentsReport availableItems={items} />;
}
