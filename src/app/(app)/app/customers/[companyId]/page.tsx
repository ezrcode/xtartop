import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/actions/workspace";
import { getContacts } from "@/actions/companies";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { getCachedUserWithRole } from "@/lib/cache/queries";
import { ClientOnly } from "@/components/client-only";
import { CustomerDetail } from "@/components/customers/customer-detail";

export const revalidate = 60;

interface Props {
    params: Promise<{ companyId: string }>;
}

export default async function CustomerDetailPage({ params }: Props) {
    const { companyId } = await params;
    const session = await auth();

    const workspace = await getCurrentWorkspace();
    if (!workspace) redirect("/login");

    const [company, contacts, userWithRole] = await Promise.all([
        prisma.company.findFirst({
            where: {
                id: companyId,
                workspaceId: workspace.id,
                status: "ACTIVO",
                type: { in: ["CLIENTE_SUSCRIPTOR", "CLIENTE_ONETIME"] },
            },
            include: {
                workspace: {
                    select: {
                        name: true,
                        legalName: true,
                        contractTemplate: true,
                        contractVersion: true,
                    },
                },
                primaryContact: true,
                contacts: true,
                clientInvitations: {
                    include: { contact: true },
                    orderBy: { createdAt: "desc" },
                },
                projects: { orderBy: { createdAt: "desc" } },
                clientUsers: { orderBy: { createdAt: "desc" } },
            },
        }),
        getContacts(),
        session?.user?.email ? getCachedUserWithRole(session.user.email) : null,
    ]);

    if (!company) notFound();

    return (
        <ClientOnly>
            <CustomerDetail
                company={company}
                contacts={contacts}
                userRole={userWithRole?.role || null}
            />
        </ClientOnly>
    );
}
