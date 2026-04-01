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
        <div className="min-h-screen bg-[var(--surface-0)] py-6 md:py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-[var(--foreground)]">
                        Hola, {firstName}
                    </h1>
                    <p className="text-[var(--muted-text)] mt-1 text-sm md:text-base">
                        Aquí tienes un resumen de tu CRM
                    </p>
                </div>

                {/* Row 1 — CRM Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
                    <StatCard
                        label="Clientes"
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

                {/* Quick Actions */}
                <div className="bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)] p-5">
                    <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">
                        Acciones Rápidas
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                        <Link
                            href="/app/companies/new"
                            className="flex flex-col items-center p-4 rounded-lg bg-[var(--hover-bg)] hover:bg-[var(--surface-0)] transition-colors"
                        >
                            <div className="w-12 h-12 rounded-full bg-nearby-dark flex items-center justify-center mb-2">
                                <Building2 size={22} className="text-white" />
                            </div>
                            <span className="text-xs font-medium text-[var(--foreground)]">
                                Nueva Empresa
                            </span>
                        </Link>
                        <Link
                            href="/app/contacts/new"
                            className="flex flex-col items-center p-4 rounded-lg bg-[var(--hover-bg)] hover:bg-[var(--surface-0)] transition-colors"
                        >
                            <div className="w-12 h-12 rounded-full bg-ocean-blue flex items-center justify-center mb-2">
                                <Users size={22} className="text-white" />
                            </div>
                            <span className="text-xs font-medium text-[var(--foreground)]">
                                Nuevo Contacto
                            </span>
                        </Link>
                        <Link
                            href="/app/deals/new"
                            className="flex flex-col items-center p-4 rounded-lg bg-[var(--hover-bg)] hover:bg-[var(--surface-0)] transition-colors"
                        >
                            <div className="w-12 h-12 rounded-full bg-success-green flex items-center justify-center mb-2">
                                <TrendingUp size={22} className="text-white" />
                            </div>
                            <span className="text-xs font-medium text-[var(--foreground)]">
                                Nuevo Negocio
                            </span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
