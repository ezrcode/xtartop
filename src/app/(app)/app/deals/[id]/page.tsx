import { getDeal, getCompanies, getContacts } from "@/actions/deals";
import { DealForm } from "@/components/deals/deal-form";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

export default async function EditDealPage({ 
    params 
}: { 
    params: Promise<{ id: string }> 
}) {
    const { id } = await params;
    const [deal, companies, contacts] = await Promise.all([
        getDeal(id),
        getCompanies(),
        getContacts(),
    ]);

    if (!deal) {
        notFound();
    }

    return <DealForm deal={deal} companies={companies} contacts={contacts} isEditMode={true} />;
}

