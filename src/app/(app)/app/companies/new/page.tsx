import { getContacts } from "@/actions/companies";
import { CompanyForm } from "@/components/companies/company-form";
import { ClientOnly } from "@/components/client-only";

// Cache for 2 minutes - "new" pages rarely change
export const revalidate = 120;

export default async function NewCompanyPage() {
    const contacts = await getContacts();

    return (
        <ClientOnly>
            <CompanyForm contacts={contacts} isEditMode={false} />
        </ClientOnly>
    );
}

