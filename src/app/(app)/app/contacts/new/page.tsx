import { getCompanies } from "@/actions/contacts";
import { ContactForm } from "@/components/contacts/contact-form";
import { ClientOnly } from "@/components/client-only";

// Cache for 2 minutes - "new" pages rarely change
export const revalidate = 120;

export default async function NewContactPage() {
    const companies = await getCompanies();

    return (
        <ClientOnly>
            <ContactForm companies={companies} isEditMode={false} />
        </ClientOnly>
    );
}
