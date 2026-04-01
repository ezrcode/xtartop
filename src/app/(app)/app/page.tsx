import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/actions/workspace";
import { DealStatus } from "@prisma/client";
import Link from "next/link";
import {
    Building2,
    Users,
    TrendingUp,
    DollarSign,
    FolderOpen,
    UserCheck,
    Repeat,
    CalendarRange,
} from "lucide-react";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";

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

async function getBasicStats(workspaceId: string) {
    try {
        const [
            allCompaniesCount,
            clientCompaniesCount,
            contactsCount,
            dealsCount,
            activeProjects,
            activeClientUsers,
            pipelineValue,
            clientCompanies,
        ] = await Promise.all([
            prisma.company.count({ where: { workspaceId } }),
            prisma.company.count({ where: { workspaceId, status: "ACTIVO", type: "CLIENTE_SUSCRIPTOR" } }),
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
                where: { workspaceId, status: "ACTIVO", type: "CLIENTE_SUSCRIPTOR", subscriptionBilling: { isNot: null } },
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

        const arr = mrr * 12;
        const pipeline = Number(pipelineValue._sum.value || 0);

        return {
            allCompaniesCount,
            clientCompaniesCount,
            contactsCount,
            dealsCount,
            activeProjects,
            activeClientUsers,
            mrr,
            arr,
            pipeline,
        };
    } catch (error) {
        console.error("Error fetching stats:", error);
        return {
            allCompaniesCount: 0,
            clientCompaniesCount: 0,
            contactsCount: 0,
            dealsCount: 0,
            activeProjects: 0,
            activeClientUsers: 0,
            mrr: 0,
            arr: 0,
            pipeline: 0,
        };
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

        const map = new Map(raw.map((r) => [r.status, r]));

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

function formatCompact(value: number) {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
}

interface StatCardProps {
    label: string;
    value: string | number;
    description?: string;
    icon: React.ComponentType<{ size?: number | string; className?: string }>;
    gradient: string;
    iconColor: string;
}

function StatCard({ label, value, description, icon: Icon, gradient, iconColor }: StatCardProps) {
    return (
        <div className="bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)] p-4 sm:p-5 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-start justify-between mb-3">
                <span className="text-[10px] sm:text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider">
                    {label}
                </span>
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg ${gradient} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                    <Icon size={18} className={iconColor} />
                </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] leading-none">
                {typeof value === "number" ? value.toLocaleString() : value}
            </p>
            {description && (
                <p className="text-[10px] sm:text-xs text-[var(--muted-text)] mt-2">{description}</p>
            )}
        </div>
    );
}

export default async function DashboardPage() {
    const session = await auth();

    if (!session?.user?.email) {
        redirect("/login");
    }

    const workspace = await getCurrentWorkspace();

    const [stats, pipelineData] = await Promise.all([
        workspace ? getBasicStats(workspace.id) : Promise.resolve(null),
        workspace ? getPipelineBreakdown(workspace.id) : Promise.resolve([]),
    ]);

    const firstName =
        session.user.name?.split(" ")[0] ||
        session.user.email?.split("@")[0] ||
        "Usuario";

    return (
        <div className="min-h-screen bg-[var(--surface-0)] py-4 md:py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-5 md:mb-8">
                    <div className="rounded-[28px] border border-[var(--card-border)] bg-[linear-gradient(145deg,var(--surface-1),var(--surface-2))] p-5 shadow-sm md:rounded-2xl md:bg-transparent md:border-0 md:p-0 md:shadow-none">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-text)]">
                                    Dashboard
                                </p>
                                <h1 className="mt-1 text-2xl md:text-3xl font-bold text-[var(--foreground)]">
                                    Hola, {firstName}
                                </h1>
                                <p className="text-[var(--muted-text)] mt-1.5 text-sm md:text-base">
                                    Resumen operativo y comercial del workspace.
                                </p>
                            </div>
                            <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-1)] px-3 py-2 shadow-sm">
                                <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted-text)]">
                                    Hoy
                                </span>
                                <span className="text-sm font-semibold text-[var(--foreground)]">
                                    {new Date().toLocaleDateString("es-DO", { day: "2-digit", month: "short" })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="mb-5 md:mb-6">
                    <div className="md:hidden mb-3">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted-text)]">
                            Acciones rápidas
                        </p>
                    </div>
                    <div className="grid grid-cols-3 gap-3 md:rounded-lg md:border md:border-[var(--card-border)] md:bg-[var(--card-bg)] md:p-5">
                        <Link
                            href="/app/companies/new"
                            className="flex flex-col items-center rounded-[24px] border border-[var(--card-border)] bg-[var(--surface-1)] p-4 shadow-sm transition-transform hover:-translate-y-0.5 md:rounded-lg md:border-0 md:bg-[var(--hover-bg)] md:hover:bg-[var(--surface-0)]"
                        >
                            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-nearby-dark text-white shadow-sm">
                                <Building2 size={22} />
                            </div>
                            <span className="text-center text-[11px] font-medium text-[var(--foreground)] md:text-xs">
                                Nueva Empresa
                            </span>
                        </Link>
                        <Link
                            href="/app/contacts/new"
                            className="flex flex-col items-center rounded-[24px] border border-[var(--card-border)] bg-[var(--surface-1)] p-4 shadow-sm transition-transform hover:-translate-y-0.5 md:rounded-lg md:border-0 md:bg-[var(--hover-bg)] md:hover:bg-[var(--surface-0)]"
                        >
                            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-ocean-blue text-white shadow-sm">
                                <Users size={22} />
                            </div>
                            <span className="text-center text-[11px] font-medium text-[var(--foreground)] md:text-xs">
                                Nuevo Contacto
                            </span>
                        </Link>
                        <Link
                            href="/app/deals/new"
                            className="flex flex-col items-center rounded-[24px] border border-[var(--card-border)] bg-[var(--surface-1)] p-4 shadow-sm transition-transform hover:-translate-y-0.5 md:rounded-lg md:border-0 md:bg-[var(--hover-bg)] md:hover:bg-[var(--surface-0)]"
                        >
                            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-success-green text-white shadow-sm">
                                <TrendingUp size={22} />
                            </div>
                            <span className="text-center text-[11px] font-medium text-[var(--foreground)] md:text-xs">
                                Nuevo Negocio
                            </span>
                        </Link>
                    </div>
                </div>

                <div className="mb-3 md:mb-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted-text)]">
                        Comercial
                    </p>
                </div>

                {/* Row 1 — CRM Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
                    <StatCard
                        label="Clientes Suscriptores"
                        value={stats?.clientCompaniesCount ?? 0}
                        description={`${stats?.allCompaniesCount ?? 0} empresas total`}
                        icon={Building2}
                        gradient="bg-gradient-to-br from-nearby-dark/20 to-nearby-dark/5"
                        iconColor="text-nearby-dark dark:text-nearby-dark-300"
                    />
                    <StatCard
                        label="Contactos"
                        value={stats?.contactsCount ?? 0}
                        description="Personas registradas"
                        icon={Users}
                        gradient="bg-gradient-to-br from-ocean-blue/20 to-ocean-blue/5"
                        iconColor="text-ocean-blue"
                    />
                    <StatCard
                        label="Negocios"
                        value={stats?.dealsCount ?? 0}
                        description="Oportunidades activas"
                        icon={TrendingUp}
                        gradient="bg-gradient-to-br from-success-green/20 to-success-green/5"
                        iconColor="text-success-green"
                    />
                    <StatCard
                        label="Pipeline"
                        value={formatCompact(stats?.pipeline ?? 0)}
                        description="Valor en negociación"
                        icon={DollarSign}
                        gradient="bg-gradient-to-br from-warning-amber/20 to-warning-amber/5"
                        iconColor="text-warning-amber"
                    />
                </div>

                <div className="mb-3 md:mb-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted-text)]">
                        Licencias e ingresos
                    </p>
                </div>

                {/* Row 2 — Revenue */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                    <StatCard
                        label="Proyectos Activos"
                        value={stats?.activeProjects ?? 0}
                        icon={FolderOpen}
                        gradient="bg-gradient-to-br from-nearby-dark/10 to-transparent"
                        iconColor="text-nearby-dark dark:text-nearby-dark-300"
                    />
                    <StatCard
                        label="Usuarios Activos"
                        value={stats?.activeClientUsers ?? 0}
                        icon={UserCheck}
                        gradient="bg-gradient-to-br from-ocean-blue/10 to-transparent"
                        iconColor="text-ocean-blue"
                    />
                    <StatCard
                        label="MRR"
                        value={`$${(stats?.mrr ?? 0).toLocaleString()}`}
                        description="Mensual recurrente"
                        icon={Repeat}
                        gradient="bg-gradient-to-br from-info-blue/20 to-info-blue/5"
                        iconColor="text-ocean-blue"
                    />
                    <StatCard
                        label="ARR"
                        value={formatCompact(stats?.arr ?? 0)}
                        description="Anual recurrente"
                        icon={CalendarRange}
                        gradient="bg-gradient-to-br from-success-green/20 to-success-green/5"
                        iconColor="text-success-green"
                    />
                </div>

                {/* Pipeline Chart */}
                <div className="mb-6">
                    <DashboardCharts pipeline={pipelineData} />
                </div>
            </div>
        </div>
    );
}
