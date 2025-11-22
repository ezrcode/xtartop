import { getCompany, getContacts } from "@/actions/companies";
import { CompanyForm } from "@/components/companies/company-form";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

export default async function EditCompanyPage({ 
    params 
}: { 
    params: Promise<{ id: string }> 
}) {
    const { id } = await params;
    const [company, contacts] = await Promise.all([
        getCompany(id),
        getContacts(),
    ]);

    if (!company) {
        notFound();
    }

    return <CompanyForm company={company} contacts={contacts} isEditMode={true} />;
}

