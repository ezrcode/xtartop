import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/actions/workspace";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { HeartHandshake } from "lucide-react";
import { CustomersTable } from "@/components/customers/customers-table";

export const revalidate = 30;

async function getCustomers(workspaceId: string) {
    return prisma.company.findMany({
        where: {
            workspaceId,
            status: "ACTIVO",
            type: { in: ["CLIENTE_SUSCRIPTOR", "CLIENTE_ONETIME"] },
        },
        include: {
            primaryContact: {
                select: { id: true, fullName: true },
            },
            projects: {
                where: { status: "ACTIVE" },
                select: { id: true },
            },
            clientUsers: {
                where: { status: "ACTIVE" },
                select: { id: true },
            },
        },
        orderBy: { name: "asc" },
    });
}

export default async function CustomersPage() {
    const workspace = await getCurrentWorkspace();
    if (!workspace) redirect("/login");

    const customers = await getCustomers(workspace.id);

    const rows = customers.map((c) => ({
        id: c.id,
        name: c.name,
        logoUrl: c.logoUrl,
        type: c.type,
        contactName: c.primaryContact?.fullName || null,
        projects: c.projects.length,
        users: c.clientUsers.length,
    }));

    return (
        <div className="min-h-screen bg-[var(--surface-0)] py-6 sm:py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <PageHeader
                    title="Clientes"
                    count={rows.length}
                    description="Gestión de clientes activos — Customer Success"
                    icon={HeartHandshake}
                />
                <CustomersTable customers={rows} />
            </div>
        </div>
    );
}
