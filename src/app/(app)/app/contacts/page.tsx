import { getContacts } from "@/actions/contacts";
import { getTablePreferences } from "@/actions/table-preferences";
import { getUserItemsPerPage } from "@/actions/profile";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";
import { Plus, Users } from "lucide-react";

export const revalidate = 30;
export const dynamic = "force-dynamic";

export default async function ContactsPage() {
    console.log("[CONTACTS] Starting page render...");
    
    let contacts: Awaited<ReturnType<typeof getContacts>> = [];
    let preferences: Awaited<ReturnType<typeof getTablePreferences>> = null;
    let itemsPerPage: number = 10;

    try {
        console.log("[CONTACTS] Fetching contacts...");
        contacts = await getContacts();
        console.log("[CONTACTS] Got", contacts.length, "contacts");
    } catch (error) {
        console.error("[CONTACTS] Error fetching contacts:", error);
    }

    try {
        console.log("[CONTACTS] Fetching preferences...");
        preferences = await getTablePreferences("contacts");
        console.log("[CONTACTS] Got preferences:", !!preferences);
    } catch (error) {
        console.error("[CONTACTS] Error fetching preferences:", error);
    }

    try {
        console.log("[CONTACTS] Fetching itemsPerPage...");
        itemsPerPage = await getUserItemsPerPage();
        console.log("[CONTACTS] Got itemsPerPage:", itemsPerPage);
    } catch (error) {
        console.error("[CONTACTS] Error fetching itemsPerPage:", error);
    }

    console.log("[CONTACTS] Rendering JSX...");

    return (
        <div className="min-h-screen bg-[var(--surface-0)] py-6 sm:py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <PageHeader
                    title="Contactos"
                    count={contacts.length}
                    description="Gestiona tu red de contactos"
                    icon={Users}
                    actions={
                        <Link
                            href="/app/contacts/new"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-nearby-dark rounded-xl hover:bg-nearby-dark-600 transition-colors shadow-sm"
                        >
                            <Plus size={16} />
                            Nuevo Contacto
                        </Link>
                    }
                />
                <ContactsTable contacts={contacts} initialPreferences={preferences} itemsPerPage={itemsPerPage as 10 | 25 | 50} />
            </div>
        </div>
    );
}
