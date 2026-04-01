import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/actions/workspace";
import { redirect, notFound } from "next/navigation";
import { SubscriptionDetail } from "@/components/subscriptions/subscription-detail";

interface Props {
    params: Promise<{ companyId: string }>;
}

export default async function SubscriptionDetailPage({ params }: Props) {
    const { companyId } = await params;
    const workspace = await getCurrentWorkspace();
    if (!workspace) redirect("/login");

    const company = await prisma.company.findFirst({
        where: { id: companyId, workspaceId: workspace.id },
        select: {
            id: true,
            name: true,
            taxId: true,
            admCloudRelationshipId: true,
            admCloudLastSync: true,
        },
    });

    if (!company) notFound();

    return (
        <div className="min-h-screen bg-[var(--surface-0)] py-6 sm:py-8">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <SubscriptionDetail
                    companyId={company.id}
                    companyName={company.name}
                    taxId={company.taxId}
                    admCloudRelationshipId={company.admCloudRelationshipId}
                    admCloudLastSync={company.admCloudLastSync}
                />
            </div>
        </div>
    );
}
