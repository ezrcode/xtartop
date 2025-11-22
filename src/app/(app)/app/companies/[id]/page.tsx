import { getCompany, getContacts } from "@/actions/companies";
import { CompanyForm } from "@/components/companies/company-form";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateStaticParams() {
    return [];
}

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

