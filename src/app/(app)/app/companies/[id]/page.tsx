import { getCompany, getContacts } from "@/actions/companies";
import { CompanyForm } from "@/components/companies/company-form";
import { notFound } from "next/navigation";
import { ClientOnly } from "@/components/client-only";

// Cache for 60 seconds - detail pages can be cached longer
export const revalidate = 60;
export const dynamicParams = true;

export default async function EditCompanyPage({ 
    params 
}: { 
    params: Promise<{ id: string }> 
}) {
    const { id } = await params;
    
    // Don't fetch activities here - let Suspense handle it
    const [company, contacts] = await Promise.all([
        getCompany(id),
        getContacts(),
    ]);

    if (!company) {
        notFound();
    }

    return (
        <ClientOnly>
            <CompanyForm company={company} contacts={contacts} isEditMode={true} />
        </ClientOnly>
    );
}

