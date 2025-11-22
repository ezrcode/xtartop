import { getContacts } from "@/actions/companies";
import { CompanyForm } from "@/components/companies/company-form";

export const dynamic = 'force-dynamic';

export default async function NewCompanyPage() {
    const contacts = await getContacts();

    return <CompanyForm contacts={contacts} isEditMode={false} />;
}

