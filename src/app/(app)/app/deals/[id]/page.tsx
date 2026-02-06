import { getDeal, getCompanies, getContacts } from "@/actions/deals";
import { getActiveBusinessLines } from "@/actions/business-lines";
import { DealForm } from "@/components/deals/deal-form";
import { getWorkspaceWithMembers } from "@/actions/workspace";
import { notFound } from "next/navigation";
import { ClientOnly } from "@/components/client-only";

// Cache for 60 seconds - detail pages can be cached longer
export const revalidate = 60;
export const dynamicParams = true;

export default async function EditDealPage({ 
    params 
}: { 
    params: Promise<{ id: string }> 
}) {
    const { id } = await params;
    
    // Don't fetch activities here - let Suspense handle it
    const [deal, companies, contacts, businessLines, workspace] = await Promise.all([
        getDeal(id),
        getCompanies(),
        getContacts(),
        getActiveBusinessLines(),
        getWorkspaceWithMembers(),
    ]);

    if (!deal) {
        notFound();
    }

    return (
        <ClientOnly>
            <DealForm 
                deal={deal} 
                companies={companies} 
                contacts={contacts}
                businessLines={businessLines}
                isEditMode={true} 
                workspace={workspace ? {
                    legalName: workspace.legalName,
                    rnc: workspace.rnc,
                    address: workspace.address,
                    phone: workspace.phone,
                    logoUrl: workspace.logoUrl,
                } : undefined}
            />
        </ClientOnly>
    );
}
