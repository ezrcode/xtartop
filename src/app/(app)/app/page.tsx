import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
    const session = await auth();

    if (!session?.user?.email) {
        redirect("/login");
    }

    const firstName = session.user.name?.split(" ")[0] || session.user.email?.split("@")[0] || "Usuario";

    return (
        <div className="min-h-screen bg-soft-gray py-6 md:py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-2xl md:text-3xl font-bold text-nearby-dark">
                    Hola, {firstName} 👋
                </h1>
                <p className="text-dark-slate mt-1">
                    Dashboard en construcción
                </p>
            </div>
        </div>
    );
}
