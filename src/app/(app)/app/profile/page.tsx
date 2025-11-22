import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
    const session = await auth();
    
    if (!session?.user) {
        redirect("/login");
    }

    return (
        <div className="min-h-screen bg-soft-gray py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-xtartop-black">Mi Perfil</h1>
                    <p className="text-dark-slate mt-2">
                        Gestiona tu información personal y preferencias
                    </p>
                </div>

                {/* Profile Content */}
                <div className="bg-white shadow-sm rounded-lg border border-graphite-gray p-6">
                    <div className="flex items-center space-x-6 mb-8">
                        {/* Avatar */}
                        <div className="h-24 w-24 rounded-full bg-gradient-to-br from-founder-blue to-ocean-blue flex items-center justify-center text-white text-3xl font-semibold shadow-lg">
                            {session.user.name 
                                ? session.user.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
                                : session.user.email?.substring(0, 2).toUpperCase() || "U"
                            }
                        </div>

                        {/* User Info */}
                        <div>
                            <h2 className="text-2xl font-bold text-xtartop-black">
                                {session.user.name || "Usuario"}
                            </h2>
                            <p className="text-gray-600 mt-1">
                                {session.user.email}
                            </p>
                        </div>
                    </div>

                    {/* Placeholder for future profile settings */}
                    <div className="border-t border-graphite-gray pt-6">
                        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                            <p className="text-gray-500 text-lg">
                                Configuración de perfil
                            </p>
                            <p className="text-gray-400 text-sm mt-2">
                                Esta sección se implementará próximamente
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

