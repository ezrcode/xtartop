import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/actions/workspace";
import { Building2, Users, TrendingUp, DollarSign } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";

// Cache for 60 seconds - dashboard doesn't need real-time updates
export const revalidate = 60;

async function getDashboardStats(workspaceId: string) {
    const [companiesCount, contactsCount, dealsCount, recentActivities] = await Promise.all([
        prisma.company.count({ where: { workspaceId } }),
        prisma.contact.count({ where: { workspaceId } }),
        prisma.deal.count({ where: { workspaceId } }),
        prisma.activity.findMany({
            where: { 
                workspaceId,
                type: { in: ["EMAIL", "PROJECT", "CLIENT_USER", "NOTE"] }
            },
            include: {
                createdBy: { select: { name: true, email: true } }
            },
            orderBy: { createdAt: "desc" },
            take: 10,
        }),
    ]);

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
    };
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
                        value="$0"
                        icon={DollarSign}
                        color="warning"
                        description="Ingresos proyectados"
                    />
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
