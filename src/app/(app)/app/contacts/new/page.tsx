import { getCompanies } from "@/actions/contacts";
import { ContactForm } from "@/components/contacts/contact-form";

export const dynamic = 'force-dynamic';

export default async function NewContactPage() {
    const companies = await getCompanies();

    return <ContactForm companies={companies} isEditMode={false} />;
}
