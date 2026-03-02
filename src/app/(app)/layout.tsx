import { Suspense } from "react";
import { AppLayoutClient } from "@/components/layout/app-layout-client";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCachedLatestExchangeRate, getCachedUserWithRole } from "@/lib/cache/queries";

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    
    if (!session?.user?.email) {
        redirect("/login");
    }

    const userWithRole = await getCachedUserWithRole(session.user.email);
    const latestExchangeRate = userWithRole?.workspaceId
        ? await getCachedLatestExchangeRate(userWithRole.workspaceId)
        : null;

    return (
        <AppLayoutClient 
            user={userWithRole?.user || session.user}
            userRole={userWithRole?.role || null}
            currentExchangeRate={latestExchangeRate ? Number(latestExchangeRate.rate) : null}
        >
            {children}
        </AppLayoutClient>
    );
}
