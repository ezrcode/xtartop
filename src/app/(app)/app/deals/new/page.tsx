import { getCompanies, getContacts } from "@/actions/deals";
import { DealForm } from "@/components/deals/deal-form";
import { ClientOnly } from "@/components/client-only";

// Cache for 2 minutes - "new" pages rarely change
export const revalidate = 120;

export default async function NewDealPage() {
    const [companies, contacts] = await Promise.all([
        getCompanies(),
        getContacts(),
    ]);

    return (
        <ClientOnly>
            <DealForm companies={companies} contacts={contacts} isEditMode={false} />
        </ClientOnly>
    );
}

