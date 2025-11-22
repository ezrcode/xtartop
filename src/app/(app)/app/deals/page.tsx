import { getDeals } from "@/actions/deals";
import { DealsClientPage } from "@/components/deals/deals-client-page";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DealsPage() {
    const session = await auth();
    
    if (!session?.user?.email) {
        redirect("/login");
    }

    const [deals, user] = await Promise.all([
        getDeals(),
        prisma.user.findUnique({
            where: { email: session.user.email },
            select: { dealsViewPref: true },
        }),
    ]);

    const defaultView = user?.dealsViewPref === "KANBAN" ? "kanban" : "table";

    return <DealsClientPage deals={deals} defaultView={defaultView} />;
}

