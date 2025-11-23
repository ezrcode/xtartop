import { auth } from "@/auth";
import { redirect } from "next/navigation";

// Cache for 60 seconds - dashboard doesn't need real-time updates
export const revalidate = 60;

export default async function DashboardPage() {
    const session = await auth();

    if (!session?.user?.email) {
        redirect("/login");
    }

    return (
        <div className="min-h-screen bg-soft-gray py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-xtartop-black">
                        Hola, {session.user.name || session.user.email}
                    </h1>
                    <p className="text-dark-slate mt-2">
                        Bienvenido a tu dashboard de gestión de ventas
                    </p>
                </div>

                {/* Placeholder for future dashboard widgets */}
                <div className="bg-white shadow-sm rounded-lg border border-graphite-gray p-12">
                    <div className="flex flex-col items-center justify-center text-center">
                        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-founder-blue to-ocean-blue flex items-center justify-center mb-6">
                            <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                width="40" 
                                height="40" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="white" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                            >
                                <path d="M3 3v18h18"/>
                                <path d="M18 17V9"/>
                                <path d="M13 17V5"/>
                                <path d="M8 17v-3"/>
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-xtartop-black mb-2">
                            Dashboard de Métricas
                        </h2>
                        <p className="text-gray-600 max-w-md">
                            Aquí se mostrarán tus métricas clave, gráficos de rendimiento y actividad reciente. 
                            Esta funcionalidad se implementará próximamente.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
