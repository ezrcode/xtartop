import { getContact, getCompanies } from "@/actions/contacts";
import { ContactForm } from "@/components/contacts/contact-form";
import { notFound } from "next/navigation";

export default async function EditContactPage({ params }: { params: { id: string } }) {
    const contact = await getContact(params.id);
    const companies = await getCompanies();

    if (!contact) {
        notFound();
    }

    return <ContactForm contact={contact} companies={companies} isEditMode={true} />;
}
