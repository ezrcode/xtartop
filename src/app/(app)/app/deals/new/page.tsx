import { getCompanies, getContacts } from "@/actions/deals";
import { getActiveBusinessLines } from "@/actions/business-lines";
import { DealForm } from "@/components/deals/deal-form";
import { ClientOnly } from "@/components/client-only";

// Cache for 2 minutes - "new" pages rarely change
export const revalidate = 120;

export default async function NewDealPage() {
    const [companies, contacts, businessLines] = await Promise.all([
        getCompanies(),
        getContacts(),
        getActiveBusinessLines(),
    ]);

    return (
        <ClientOnly>
            <DealForm 
                companies={companies} 
                contacts={contacts} 
                businessLines={businessLines}
                isEditMode={false} 
            />
        </ClientOnly>
    );
}

