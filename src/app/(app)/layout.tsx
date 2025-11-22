import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    
    if (!session?.user?.email) {
        redirect("/login");
    }

    return (
        <div className="flex min-h-screen bg-soft-gray">
            <Sidebar />
            <div className="flex-1 md:ml-20 transition-all duration-300">
                <Topbar user={session.user} />
                <main>
                    {children}
                </main>
            </div>
        </div>
    );
}
