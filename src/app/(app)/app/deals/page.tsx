import { getDeals } from "@/actions/deals";
import { getTablePreferences } from "@/actions/table-preferences";
import { DealsClientPage } from "@/components/deals/deals-client-page";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

// Cache for 30 seconds - good balance for list pages
export const revalidate = 30;

export default async function DealsPage() {
    const session = await auth();
    
    if (!session?.user?.email) {
        redirect("/login");
    }

    const [deals, user, tablePreferences] = await Promise.all([
        getDeals(),
        prisma.user.findUnique({
            where: { email: session.user.email },
            select: { dealsViewPref: true },
        }),
        getTablePreferences("deals"),
    ]);

    const defaultView = user?.dealsViewPref === "KANBAN" ? "kanban" : "table";

    return (
        <DealsClientPage 
            deals={deals} 
            defaultView={defaultView} 
            initialTablePreferences={tablePreferences}
        />
    );
}
