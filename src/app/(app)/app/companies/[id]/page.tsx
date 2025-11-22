import { getCompany, getContacts } from "@/actions/companies";
import { CompanyForm } from "@/components/companies/company-form";
import { notFound } from "next/navigation";

export default async function EditCompanyPage({ params }: { params: { id: string } }) {
    const [company, contacts] = await Promise.all([
        getCompany(params.id),
        getContacts(),
    ]);

    if (!company) {
        notFound();
    }

    return <CompanyForm company={company} contacts={contacts} isEditMode={true} />;
}

