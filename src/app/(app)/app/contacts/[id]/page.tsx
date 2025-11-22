import { getContact, getCompanies } from "@/actions/contacts";
import { ContactForm } from "@/components/contacts/contact-form";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

export default async function EditContactPage({ 
    params 
}: { 
    params: Promise<{ id: string }> 
}) {
    const { id } = await params;
    const contact = await getContact(id);
    const companies = await getCompanies();

    if (!contact) {
        notFound();
    }

    return <ContactForm contact={contact} companies={companies} isEditMode={true} />;
}
