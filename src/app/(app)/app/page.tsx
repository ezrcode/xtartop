import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/actions/workspace";
import { Building2, Users, TrendingUp, DollarSign } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { DealsPipeline } from "@/components/dashboard/deals-pipeline";
import { CompaniesByStatus } from "@/components/dashboard/companies-by-status";
import { RevenueMetrics } from "@/components/dashboard/revenue-metrics";
import { PendingActions } from "@/components/dashboard/pending-actions";

// Cache for 60 seconds - dashboard doesn't need real-time updates
export const revalidate = 60;

async function getDashboardStats(workspaceId: string) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Basic counts - these are safe
        const [companiesCount, contactsCount, dealsCount] = await Promise.all([
            prisma.company.count({ where: { workspaceId } }),
            prisma.contact.count({ where: { workspaceId } }),
            prisma.deal.count({ where: { workspaceId } }),
        ]);

        // Recent activities
        let recentActivities: Array<{
            id: string;
            type: string;
            emailSubject: string | null;
            createdAt: Date;
            createdBy: { name: string | null; email: string } | null;
        }> = [];
        try {
            recentActivities = await prisma.activity.findMany({
                where: { 
                    workspaceId,
                    type: { in: ["EMAIL", "PROJECT", "CLIENT_USER", "NOTE"] }
                },
                include: {
                    createdBy: { select: { name: true, email: true } }
                },
                orderBy: { createdAt: "desc" },
                take: 10,
            });
        } catch (e) {
            console.error("Error fetching activities:", e);
        }

        // Deals by status for pipeline
        let dealsByStatus: Array<{ status: string; _count: { id: number }; _sum: { value: number | null } }> = [];
        try {
            dealsByStatus = await prisma.deal.groupBy({
                by: ["status"],
                where: { workspaceId },
                _count: { id: true },
                _sum: { value: true },
            }) as any;
        } catch (e) {
            console.error("Error fetching deals by status:", e);
        }

        // Companies by status
        let companiesByStatus: Array<{ status: string; _count: { id: number } }> = [];
        try {
            companiesByStatus = await prisma.company.groupBy({
                by: ["status"],
                where: { workspaceId },
                _count: { id: true },
            }) as any;
        } catch (e) {
            console.error("Error fetching companies by status:", e);
        }

        // Revenue data
        let revenueData: { _sum: { mrr: any; arr: any; value: any } } = { _sum: { mrr: null, arr: null, value: null } };
        try {
            revenueData = await prisma.deal.aggregate({
                where: { 
                    workspaceId,
                    status: { in: ["NEGOCIACION", "FORMALIZACION", "CIERRE_GANADO"] }
                },
                _sum: { mrr: true, arr: true, value: true },
            });
        } catch (e) {
            console.error("Error fetching revenue:", e);
        }

        // Pending counts
        let pendingInvitations = 0, draftQuotes = 0, pendingOnboarding = 0, todayActivities = 0;
        try {
            [pendingInvitations, draftQuotes, pendingOnboarding, todayActivities] = await Promise.all([
                prisma.clientInvitation.count({
                    where: { 
                        company: { workspaceId },
                        status: "PENDING"
                    }
                }),
                prisma.quote.count({
                    where: {
                        deal: { workspaceId },
                        status: "BORRADOR"
                    }
                }),
                prisma.company.count({
                    where: {
                        workspaceId,
                        termsAccepted: false,
                        clientInvitations: { some: { status: "PENDING" } }
                    }
                }),
                prisma.activity.count({
                    where: {
                        workspaceId,
                        createdAt: { gte: today }
                    }
                }),
            ]);
        } catch (e) {
            console.error("Error fetching pending counts:", e);
        }

        // Transform deals by status for pipeline chart
        const stageLabels: Record<string, string> = {
            PROSPECCION: "Prospección",
            CALIFICACION: "Calificación",
            NEGOCIACION: "Negociación",
            FORMALIZACION: "Formalización",
            CIERRE_GANADO: "Ganado",
            CIERRE_PERDIDO: "Perdido",
            NO_CALIFICADOS: "No calif.",
        };

        const pipelineData = Object.keys(stageLabels).map(stage => {
            const stageData = dealsByStatus.find(d => d.status === stage);
            return {
                stage,
                label: stageLabels[stage],
                count: stageData?._count?.id || 0,
                value: Number(stageData?._sum?.value || 0),
            };
        });

        // Transform companies by status
        const statusLabels: Record<string, string> = {
            PROSPECTO: "Prospecto",
            POTENCIAL: "Potencial",
            CLIENTE: "Cliente",
            ALIADO: "Aliado",
            INACTIVO: "Inactivo",
        };

        const companiesData = Object.keys(statusLabels).map(status => {
            const statusData = companiesByStatus.find(c => c.status === status);
            return {
                status,
                label: statusLabels[status],
                count: statusData?._count?.id || 0,
            };
        });

        // Calculate pipeline and won values
        let pipelineValue = 0, wonValue = 0;
        try {
            const [pipelineDeals, wonDeals] = await Promise.all([
                prisma.deal.aggregate({
                    where: {
                        workspaceId,
                        status: { in: ["NEGOCIACION", "FORMALIZACION"] }
                    },
                    _sum: { value: true }
                }),
                prisma.deal.aggregate({
                    where: {
                        workspaceId,
                        status: "CIERRE_GANADO"
                    },
                    _sum: { value: true }
                }),
            ]);
            pipelineValue = Number(pipelineDeals._sum.value || 0);
            wonValue = Number(wonDeals._sum.value || 0);
        } catch (e) {
            console.error("Error fetching deal values:", e);
        }

        return {
            companiesCount,
            contactsCount,
            dealsCount,
            recentActivities: recentActivities.map(a => ({
                id: a.id,
                type: a.type,
                subject: a.emailSubject || "Actividad",
                createdAt: a.createdAt,
                userName: a.createdBy?.name || a.createdBy?.email?.split("@")[0] || "Usuario",
            })),
            pipelineData,
            companiesData,
            revenue: {
                mrr: Number(revenueData._sum.mrr || 0),
                arr: Number(revenueData._sum.arr || 0),
                pipelineValue,
                wonValue,
            },
            pending: {
                invitations: pendingInvitations,
                quotes: draftQuotes,
                onboarding: pendingOnboarding,
                todayActivities,
            }
        };
    } catch (error) {
        console.error("Dashboard stats error:", error);
        // Return safe defaults
        return {
            companiesCount: 0,
            contactsCount: 0,
            dealsCount: 0,
            recentActivities: [],
            pipelineData: [],
            companiesData: [],
            revenue: { mrr: 0, arr: 0, pipelineValue: 0, wonValue: 0 },
            pending: { invitations: 0, quotes: 0, onboarding: 0, todayActivities: 0 },
        };
    }
}

export default async function DashboardPage() {
    const session = await auth();

    if (!session?.user?.email) {
        redirect("/login");
    }

    const workspace = await getCurrentWorkspace();
    const stats = workspace ? await getDashboardStats(workspace.id) : null;

    const firstName = session.user.name?.split(" ")[0] || session.user.email?.split("@")[0] || "Usuario";

    return (
        <div className="min-h-screen bg-soft-gray py-6 md:py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-nearby-dark">
                        Hola, {firstName} 👋
                    </h1>
                    <p className="text-dark-slate mt-1 text-sm md:text-base">
                        Aquí tienes un resumen de tu CRM
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <StatCard
                        title="Empresas"
                        value={stats?.companiesCount || 0}
                        icon={Building2}
                        color="accent"
                        description="Total de empresas"
                    />
                    <StatCard
                        title="Contactos"
                        value={stats?.contactsCount || 0}
                        icon={Users}
                        color="info"
                        description="Total de contactos"
                    />
                    <StatCard
                        title="Negocios"
                        value={stats?.dealsCount || 0}
                        icon={TrendingUp}
                        color="success"
                        description="Negocios activos"
                    />
                    <StatCard
                        title="Este mes"
                        value={`$${((stats?.revenue?.pipelineValue || 0) / 1000).toFixed(0)}K`}
                        icon={DollarSign}
                        color="warning"
                        description="Pipeline activo"
                    />
                </div>

                {/* Pending Actions */}
                <div className="mb-6">
                    <PendingActions
                        pendingInvitations={stats?.pending.invitations || 0}
                        draftQuotes={stats?.pending.quotes || 0}
                        pendingOnboarding={stats?.pending.onboarding || 0}
                        todayActivities={stats?.pending.todayActivities || 0}
                    />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    <div className="lg:col-span-1">
                        <DealsPipeline data={stats?.pipelineData || []} />
                    </div>
                    <div className="lg:col-span-1">
                        <CompaniesByStatus data={stats?.companiesData || []} />
                    </div>
                    <div className="lg:col-span-1">
                        <RevenueMetrics
                            mrr={stats?.revenue?.mrr || 0}
                            arr={stats?.revenue?.arr || 0}
                            pipelineValue={stats?.revenue?.pipelineValue || 0}
                            wonValue={stats?.revenue?.wonValue || 0}
                        />
                    </div>
                </div>

                {/* Quick Actions & Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <QuickActions />
                    </div>
                    <div className="lg:col-span-2">
                        <RecentActivity activities={stats?.recentActivities || []} />
                    </div>
                </div>
            </div>
        </div>
    );
}
