import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/actions/workspace";
import Link from "next/link";

export const revalidate = 60;

async function getBasicStats(workspaceId: string) {
    try {
        const [
            allCompaniesCount,
            clientCompaniesCount, 
            contactsCount, 
            dealsCount,
            activeProjects,
            activeClientUsers,
            pipelineValue
        ] = await Promise.all([
            // Total de empresas (todas)
            prisma.company.count({ where: { workspaceId } }),
            // Empresas con status CLIENTE
            prisma.company.count({ where: { workspaceId, status: "CLIENTE" } }),
            prisma.contact.count({ where: { workspaceId } }),
            prisma.deal.count({ where: { workspaceId } }),
            // Total proyectos activos (solo de empresas CLIENTE)
            prisma.project.count({ 
                where: { 
                    company: { 
                        workspaceId,
                        status: "CLIENTE"
                    },
                    status: "ACTIVE" 
                } 
            }),
            // Total usuarios cliente activos (solo de empresas CLIENTE)
            prisma.clientUser.count({ 
                where: { 
                    company: { 
                        workspaceId,
                        status: "CLIENTE"
                    },
                    status: "ACTIVE" 
                } 
            }),
            // Pipeline: suma del valor de negocios que no están cerrados
            prisma.deal.aggregate({
                where: {
                    workspaceId,
                    status: { notIn: ["CIERRE_GANADO", "CIERRE_PERDIDO"] }
                },
                _sum: { value: true }
            })
        ]);

        // Calcular MRR y ARR (basado solo en empresas CLIENTE)
        const mrr = (activeClientUsers * 50) + (activeProjects * 100);
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
            pipeline
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
            pipeline: 0
        };
    }
}

export default async function DashboardPage() {
    const session = await auth();

    if (!session?.user?.email) {
        redirect("/login");
    }

    const workspace = await getCurrentWorkspace();
    const stats = workspace ? await getBasicStats(workspace.id) : null;

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

                {/* Stats Grid - Row 1: CRM básico */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
                    <div className="bg-white rounded-xl border border-graphite-gray p-3 sm:p-4">
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase mb-1">Clientes</p>
                        <p className="text-xl sm:text-2xl font-bold text-nearby-dark">{stats?.clientCompaniesCount || 0}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{stats?.allCompaniesCount || 0} empresas total</p>
                    </div>
                    <div className="bg-white rounded-xl border border-graphite-gray p-3 sm:p-4">
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase mb-1">Contactos</p>
                        <p className="text-xl sm:text-2xl font-bold text-nearby-dark">{stats?.contactsCount || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-graphite-gray p-3 sm:p-4">
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase mb-1">Negocios</p>
                        <p className="text-xl sm:text-2xl font-bold text-nearby-dark">{stats?.dealsCount || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-graphite-gray p-3 sm:p-4">
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase mb-1">Pipeline</p>
                        <p className="text-xl sm:text-2xl font-bold text-nearby-accent">
                            ${((stats?.pipeline || 0) >= 1000000 
                                ? ((stats?.pipeline || 0) / 1000000).toFixed(1) + 'M' 
                                : (stats?.pipeline || 0) >= 1000 
                                    ? ((stats?.pipeline || 0) / 1000).toFixed(0) + 'K' 
                                    : (stats?.pipeline || 0).toLocaleString())}
                        </p>
                    </div>
                </div>

                {/* Stats Grid - Row 2: Suscripciones y Revenue */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-graphite-gray p-3 sm:p-4">
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase mb-1">Proyectos Activos</p>
                        <p className="text-xl sm:text-2xl font-bold text-nearby-dark">{stats?.activeProjects || 0}</p>
                        <p className="text-[10px] text-gray-400 mt-1">$100 USD c/u</p>
                    </div>
                    <div className="bg-white rounded-xl border border-graphite-gray p-3 sm:p-4">
                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase mb-1">Usuarios Activos</p>
                        <p className="text-xl sm:text-2xl font-bold text-nearby-dark">{stats?.activeClientUsers || 0}</p>
                        <p className="text-[10px] text-gray-400 mt-1">$50 USD c/u</p>
                    </div>
                    <div className="bg-white rounded-xl border border-graphite-gray p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-white">
                        <p className="text-[10px] sm:text-xs text-blue-600 uppercase mb-1 font-medium">MRR</p>
                        <p className="text-xl sm:text-2xl font-bold text-blue-700">
                            ${(stats?.mrr || 0).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-blue-500 mt-1">Mensual recurrente</p>
                    </div>
                    <div className="bg-white rounded-xl border border-graphite-gray p-3 sm:p-4 bg-gradient-to-br from-green-50 to-white">
                        <p className="text-[10px] sm:text-xs text-green-600 uppercase mb-1 font-medium">ARR</p>
                        <p className="text-xl sm:text-2xl font-bold text-green-700">
                            ${((stats?.arr || 0) >= 1000 
                                ? ((stats?.arr || 0) / 1000).toFixed(1) + 'K' 
                                : (stats?.arr || 0).toLocaleString())}
                        </p>
                        <p className="text-[10px] text-green-500 mt-1">Anual recurrente</p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl border border-graphite-gray p-5 mb-6">
                    <h3 className="text-sm font-semibold text-nearby-dark mb-4">Acciones Rápidas</h3>
                    <div className="grid grid-cols-3 gap-3">
                        <Link 
                            href="/app/companies/new"
                            className="flex flex-col items-center p-4 rounded-xl bg-soft-gray hover:bg-gray-100 transition-colors"
                        >
                            <div className="w-12 h-12 rounded-full bg-nearby-accent flex items-center justify-center mb-2">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <span className="text-xs font-medium text-dark-slate">Nueva Empresa</span>
                        </Link>
                        <Link 
                            href="/app/contacts/new"
                            className="flex flex-col items-center p-4 rounded-xl bg-soft-gray hover:bg-gray-100 transition-colors"
                        >
                            <div className="w-12 h-12 rounded-full bg-ocean-blue flex items-center justify-center mb-2">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <span className="text-xs font-medium text-dark-slate">Nuevo Contacto</span>
                        </Link>
                        <Link 
                            href="/app/deals/new"
                            className="flex flex-col items-center p-4 rounded-xl bg-soft-gray hover:bg-gray-100 transition-colors"
                        >
                            <div className="w-12 h-12 rounded-full bg-success-green flex items-center justify-center mb-2">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                            <span className="text-xs font-medium text-dark-slate">Nuevo Negocio</span>
                        </Link>
                    </div>
                </div>

                {/* Simple message */}
                <div className="bg-white rounded-xl border border-graphite-gray p-5">
                    <h3 className="text-sm font-semibold text-nearby-dark mb-4">Resumen</h3>
                    <p className="text-gray-500 text-sm">
                        Tienes {stats?.clientCompaniesCount || 0} clientes activos de {stats?.allCompaniesCount || 0} empresas, {stats?.contactsCount || 0} contactos 
                        y {stats?.dealsCount || 0} negocios en tu CRM.
                    </p>
                </div>
            </div>
        </div>
    );
}
