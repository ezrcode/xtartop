import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/actions/workspace";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { CreditCard } from "lucide-react";
import { SubscriptionsTable } from "@/components/subscriptions/subscriptions-table";

export const revalidate = 30;

async function getSubscriptions(workspaceId: string) {
    const companies = await prisma.company.findMany({
        where: {
            workspaceId,
            status: "ACTIVO",
            type: "CLIENTE_SUSCRIPTOR",
            subscriptionBilling: { isNot: null },
        },
        include: {
            subscriptionBilling: {
                include: { items: true },
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

    return companies.map((c) => {
        const billing = c.subscriptionBilling!;
        let mrr = 0;
        for (const item of billing.items) {
            let quantity = item.manualQuantity || 0;
            if (item.countType === "ACTIVE_PROJECTS") {
                quantity = c.projects.length;
            } else if (item.countType === "ACTIVE_USERS") {
                quantity = c.clientUsers.length;
            } else if (item.countType === "CALCULATED") {
                const base = item.calculatedBase === "USERS" ? c.clientUsers.length : c.projects.length;
                quantity = Math.max(0, base - (item.calculatedSubtract || 0));
            }
            if (quantity > 0) mrr += Number(item.price) * quantity;
        }

        return {
            companyId: c.id,
            companyName: c.name,
            itemsCount: billing.items.length,
            mrr,
            billingDay: billing.billingDay,
            autoBilling: billing.autoBillingEnabled,
            projects: c.projects.length,
            users: c.clientUsers.length,
        };
    });
}

export default async function SubscriptionsPage() {
    const workspace = await getCurrentWorkspace();
    if (!workspace) redirect("/login");

    const subscriptions = await getSubscriptions(workspace.id);

    return (
        <div className="min-h-screen bg-[var(--surface-0)] py-6 sm:py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <PageHeader
                    title="Suscripciones"
                    count={subscriptions.length}
                    description="Gestión de cobros, proformas y facturas de clientes"
                    icon={CreditCard}
                />
                <SubscriptionsTable subscriptions={subscriptions} />
            </div>
        </div>
    );
}
