import { getCompanies, getContacts } from "@/actions/deals";
import { DealForm } from "@/components/deals/deal-form";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function NewDealPage() {
    const [companies, contacts] = await Promise.all([
        getCompanies(),
        getContacts(),
    ]);

    return <DealForm companies={companies} contacts={contacts} isEditMode={false} />;
}

