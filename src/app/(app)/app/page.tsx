import { auth } from "@/auth";
import { ExecutiveDashboard } from "@/components/dashboard/executive-dashboard";
import { getCurrentWorkspace } from "@/actions/workspace";
import { prisma } from "@/lib/prisma";
import { DealStatus } from "@prisma/client";
import { redirect } from "next/navigation";

export const revalidate = 60;

const STATUS_LABELS: Record<string, string> = {
    PROSPECCION: "Prospección",
    CALIFICACION: "Calificación",
    NEGOCIACION: "Negociación",
    FORMALIZACION: "Formalización",
    CIERRE_GANADO: "Cierre Ganado",
    CIERRE_PERDIDO: "Cierre Perdido",
    NO_CALIFICADOS: "No Calificados",
};

const STATUS_ORDER: DealStatus[] = [
    "PROSPECCION",
    "CALIFICACION",
    "NEGOCIACION",
    "FORMALIZACION",
    "CIERRE_GANADO",
    "CIERRE_PERDIDO",
    "NO_CALIFICADOS",
];

const EMPTY_STATS = {
    allCompaniesCount: 0,
    clientCompaniesCount: 0,
    oneTimeClientsCount: 0,
    prospectsCount: 0,
    potentialClientsCount: 0,
    contactsCount: 0,
    dealsCount: 0,
    activeProjects: 0,
    activeClientUsers: 0,
    mrr: 0,
    arr: 0,
    pipeline: 0,
};

async function getBasicStats(workspaceId: string) {
    try {
        const [
            allCompaniesCount,
            clientCompaniesCount,
            oneTimeClientsCount,
            prospectsCount,
            potentialClientsCount,
            contactsCount,
            dealsCount,
            activeProjects,
            activeClientUsers,
            pipelineValue,
            clientCompanies,
        ] = await Promise.all([
            prisma.company.count({ where: { workspaceId } }),
            prisma.company.count({ where: { workspaceId, status: "ACTIVO", type: "CLIENTE_SUSCRIPTOR" } }),
            prisma.company.count({ where: { workspaceId, status: "ACTIVO", type: "CLIENTE_ONETIME" } }),
            prisma.company.count({ where: { workspaceId, status: "ACTIVO", type: "PROSPECTO" } }),
            prisma.company.count({ where: { workspaceId, status: "ACTIVO", type: "POTENCIAL" } }),
            prisma.contact.count({ where: { workspaceId } }),
            prisma.deal.count({ where: { workspaceId } }),
            prisma.project.count({
                where: {
                    company: { workspaceId, status: "ACTIVO", type: "CLIENTE_SUSCRIPTOR" },
                    status: "ACTIVE",
                },
            }),
            prisma.clientUser.count({
                where: {
                    company: { workspaceId, status: "ACTIVO", type: "CLIENTE_SUSCRIPTOR" },
                    status: "ACTIVE",
                },
            }),
            prisma.deal.aggregate({
                where: {
                    workspaceId,
                    status: { notIn: ["CIERRE_GANADO", "CIERRE_PERDIDO"] },
                },
                _sum: { value: true },
            }),
            prisma.company.findMany({
                where: {
                    workspaceId,
                    status: "ACTIVO",
                    type: "CLIENTE_SUSCRIPTOR",
                    subscriptionBilling: { isNot: null },
                },
                include: {
                    subscriptionBilling: { include: { items: true } },
                    projects: { where: { status: "ACTIVE" }, select: { id: true } },
                    clientUsers: { where: { status: "ACTIVE" }, select: { id: true } },
                },
            }),
        ]);

        let mrr = 0;
        for (const company of clientCompanies) {
            const billing = company.subscriptionBilling;
            if (!billing) continue;

            const companyProjects = company.projects.length;
            const companyUsers = company.clientUsers.length;

            for (const item of billing.items) {
                let quantity = item.manualQuantity || 0;

                if (item.countType === "ACTIVE_PROJECTS") {
                    quantity = companyProjects;
                } else if (item.countType === "ACTIVE_USERS") {
                    quantity = companyUsers;
                } else if (item.countType === "CALCULATED") {
                    const base = item.calculatedBase === "USERS" ? companyUsers : companyProjects;
                    quantity = Math.max(0, base - (item.calculatedSubtract || 0));
                }

                if (quantity > 0) {
                    mrr += Number(item.price) * quantity;
                }
            }
        }

        return {
            allCompaniesCount,
            clientCompaniesCount,
            oneTimeClientsCount,
            prospectsCount,
            potentialClientsCount,
            contactsCount,
            dealsCount,
            activeProjects,
            activeClientUsers,
            mrr,
            arr: mrr * 12,
            pipeline: Number(pipelineValue._sum.value || 0),
        };
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return EMPTY_STATS;
    }
}

async function getPipelineBreakdown(workspaceId: string) {
    try {
        const raw = await prisma.deal.groupBy({
            by: ["status"],
            where: { workspaceId },
            _count: true,
            _sum: { value: true },
        });

        const map = new Map(raw.map((row) => [row.status, row]));

        return STATUS_ORDER.map((status) => {
            const row = map.get(status);
            return {
                status,
                label: STATUS_LABELS[status] ?? status,
                count: row?._count ?? 0,
                value: Number(row?._sum?.value ?? 0),
            };
        });
    } catch (error) {
        console.error("Error fetching pipeline breakdown:", error);
        return STATUS_ORDER.map((status) => ({
            status,
            label: STATUS_LABELS[status] ?? status,
            count: 0,
            value: 0,
        }));
    }
}

export default async function DashboardPage() {
    const session = await auth();

    if (!session?.user?.email) {
        redirect("/login");
    }

    const workspace = await getCurrentWorkspace();

    const [stats, pipeline] = await Promise.all([
        workspace ? getBasicStats(workspace.id) : Promise.resolve(EMPTY_STATS),
        workspace ? getPipelineBreakdown(workspace.id) : Promise.resolve([]),
    ]);

    const firstName = session.user.name?.split(" ")[0] || session.user.email.split("@")[0] || "Equipo";

    return <ExecutiveDashboard firstName={firstName} stats={stats} pipeline={pipeline} />;
}
