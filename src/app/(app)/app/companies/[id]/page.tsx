import { getCompany, getContacts } from "@/actions/companies";
import { CompanyForm } from "@/components/companies/company-form";
import { notFound } from "next/navigation";
import { ClientOnly } from "@/components/client-only";
import { auth } from "@/auth";
import { getCachedUserWithRole } from "@/lib/cache/queries";

// Cache for 60 seconds - detail pages can be cached longer
export const revalidate = 60;
export const dynamicParams = true;

export default async function EditCompanyPage({ 
    params 
}: { 
    params: Promise<{ id: string }> 
}) {
    const { id } = await params;
    const session = await auth();
    
    // Don't fetch activities here - let Suspense handle it
    const [company, contacts, userWithRole] = await Promise.all([
        getCompany(id),
        getContacts(),
        session?.user?.email ? getCachedUserWithRole(session.user.email) : null,
    ]);

    if (!company) {
        notFound();
    }

    const userRole = userWithRole?.role || null;

    return (
        <ClientOnly>
            <CompanyForm 
                company={company} 
                contacts={contacts} 
                isEditMode={true} 
                userRole={userRole}
            />
        </ClientOnly>
    );
}

