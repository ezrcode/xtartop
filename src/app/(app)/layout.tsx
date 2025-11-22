import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
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

    // Get user with photo
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
            name: true,
            email: true,
            photoUrl: true,
        },
    });

    return (
        <div className="flex min-h-screen bg-soft-gray">
            <Sidebar />
            <div className="flex-1 md:ml-20 transition-all duration-300">
                <Topbar user={user || session.user} />
                <main>
                    {children}
                </main>
            </div>
        </div>
    );
}
