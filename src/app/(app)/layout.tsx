import { Suspense } from "react";
import { AppLayoutClient } from "@/components/layout/app-layout-client";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCachedUserWithRole } from "@/lib/cache/queries";

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    
    if (!session?.user?.email) {
        redirect("/login");
    }

    // Get user with workspace role using cached function
    const userWithRole = await getCachedUserWithRole(session.user.email);

    return (
        <AppLayoutClient 
            user={userWithRole?.user || session.user}
            userRole={userWithRole?.role || null}
        >
            {children}
        </AppLayoutClient>
    );
}
