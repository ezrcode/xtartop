import { auth } from "@/auth";
import { ExecutiveDashboard } from "@/components/dashboard/executive-dashboard";
import { getCurrentWorkspace } from "@/actions/workspace";
import { prisma } from "@/lib/prisma";
import { DealStatus } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

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

type DashboardPreference = "ALL" | "CEO" | "CFO" | "CUSTOMER_SUCCESS";

const DASHBOARD_LABELS: Record<Exclude<DashboardPreference, "ALL">, string> = {
    CEO: "CEO",
    CFO: "CFO",
    CUSTOMER_SUCCESS: "Customer Success",
};

const DASHBOARD_ORDER: Array<Exclude<DashboardPreference, "ALL">> = ["CEO", "CFO", "CUSTOMER_SUCCESS"];

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

function normalizeDashboardView(value: string | string[] | undefined): Exclude<DashboardPreference, "ALL"> | null {
    const rawValue = Array.isArray(value) ? value[0] : value;
    if (!rawValue) return null;
    return DASHBOARD_ORDER.includes(rawValue as Exclude<DashboardPreference, "ALL">)
        ? (rawValue as Exclude<DashboardPreference, "ALL">)
        : null;
}

function DashboardSwitcher({ currentView }: { currentView: Exclude<DashboardPreference, "ALL"> }) {
    return (
        <div className="rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] p-2 shadow-sm">
            <div className="flex flex-wrap gap-2">
                {DASHBOARD_ORDER.map((view) => {
                    const isActive = view === currentView;
                    const isAvailable = view === "CEO";

                    return (
                        <Link
                            key={view}
                            href={{ pathname: "/app", query: { dashboard: view } }}
                            className={`inline-flex items-center gap-2 rounded-[var(--radius-lg)] px-4 py-2 text-sm font-medium transition-colors ${
                                isActive
                                    ? "bg-nearby-dark text-white"
                                    : "bg-[var(--surface-1)] text-[var(--foreground)] hover:bg-[var(--hover-bg)]"
                            }`}
                            aria-disabled={!isAvailable}
                        >
                            {DASHBOARD_LABELS[view]}
                            {!isAvailable && (
                                <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] ${isActive ? "bg-white/14 text-white/80" : "bg-[var(--hover-bg)] text-[var(--muted-text)]"}`}>
                                    Próximamente
                                </span>
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

function ComingSoonDashboard({
    title,
    description,
    selector,
}: {
    title: string;
    description: string;
    selector?: ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[var(--surface-0)] py-4 md:py-8">
            <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8 md:space-y-6">
                {selector}
                <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[linear-gradient(155deg,var(--surface-1),var(--surface-2))] p-8 shadow-sm sm:p-10">
                    <div className="max-w-2xl">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted-text)]">Dashboard asignado</p>
                        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">{title}</h1>
                        <p className="mt-4 text-base leading-7 text-[var(--muted-text)]">{description}</p>
                        <div className="mt-8 rounded-[var(--radius-lg)] border border-dashed border-[var(--card-border)] bg-[var(--card-bg)] p-6">
                            <p className="text-sm font-medium text-[var(--foreground)]">Pendiente de diseño e implementación</p>
                            <p className="mt-2 text-sm leading-6 text-[var(--muted-text)]">
                                Ya quedó habilitada la asignación por usuario y el intercambio desde `Todos`. Sobre esta base podemos construir el dashboard CFO y Customer Success sin volver a tocar permisos ni preferencias.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default async function DashboardPage({
    searchParams,
}: {
    searchParams?: { dashboard?: string | string[] };
}) {
    const session = await auth();

    if (!session?.user?.email) {
        redirect("/login");
    }

    const workspace = await getCurrentWorkspace();

    const [stats, pipeline, currentUser] = await Promise.all([
        workspace ? getBasicStats(workspace.id) : Promise.resolve(EMPTY_STATS),
        workspace ? getPipelineBreakdown(workspace.id) : Promise.resolve([]),
        prisma.user.findUnique({
            where: { email: session.user.email },
            select: { dashboardPreference: true },
        }),
    ]);

    const firstName = session.user.name?.split(" ")[0] || session.user.email.split("@")[0] || "Equipo";
    const dashboardPreference = currentUser?.dashboardPreference || "ALL";
    const requestedView = normalizeDashboardView(searchParams?.dashboard);
    const currentView =
        dashboardPreference === "ALL"
            ? requestedView || "CEO"
            : dashboardPreference;
    const selector = dashboardPreference === "ALL" ? <DashboardSwitcher currentView={currentView} /> : undefined;

    if (currentView === "CEO") {
        return <ExecutiveDashboard firstName={firstName} stats={stats} pipeline={pipeline} selector={selector} />;
    }

    if (currentView === "CFO") {
        return (
            <ComingSoonDashboard
                title="Dashboard CFO"
                description="Esta vista se reservará para rentabilidad, cuentas por cobrar, márgenes, cash conversion y control financiero del negocio."
                selector={selector}
            />
        );
    }

    return (
        <ComingSoonDashboard
            title="Dashboard Customer Success"
            description="Esta vista se enfocará en salud de cuentas, adopción, soporte, riesgo de churn y expansión de clientes."
            selector={selector}
        />
    );
}
