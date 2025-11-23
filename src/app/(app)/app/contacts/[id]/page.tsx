import { getContact, getCompanies } from "@/actions/contacts";
import { ContactForm } from "@/components/contacts/contact-form";
import { notFound } from "next/navigation";
import { ClientOnly } from "@/components/client-only";

// Cache for 60 seconds - detail pages can be cached longer
export const revalidate = 60;
export const dynamicParams = true;

export default async function EditContactPage({ 
    params 
}: { 
    params: Promise<{ id: string }> 
}) {
    const { id } = await params;
    
    // Don't fetch activities here - let Suspense handle it
    const [contact, companies] = await Promise.all([
        getContact(id),
        getCompanies(),
    ]);

    if (!contact) {
        notFound();
    }

    return (
        <ClientOnly>
            <ContactForm contact={contact} companies={companies} isEditMode={true} />
        </ClientOnly>
    );
}
