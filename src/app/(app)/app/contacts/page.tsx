import { getContacts } from "@/actions/contacts";
import { getTablePreferences } from "@/actions/table-preferences";
import { getUserItemsPerPage } from "@/actions/profile";
import { ContactsTable } from "@/components/contacts/contacts-table";
import Link from "next/link";

export const revalidate = 30;
export const dynamic = "force-dynamic";

export default async function ContactsPage() {
    const [contacts, preferences, itemsPerPage] = await Promise.all([
        getContacts(),
        getTablePreferences("contacts"),
        getUserItemsPerPage(),
    ]);

    const serializedContacts = contacts.map(c => ({
        id: c.id,
        fullName: c.fullName,
        email: c.email,
        mobile: c.mobile,
        receivesInvoices: c.receivesInvoices,
        status: c.status,
        createdAt: c.createdAt,
        company: c.company ? { id: c.company.id, name: c.company.name } : null,
    }));

    return (
        <div className="min-h-screen py-6 sm:py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold">Contactos ({serializedContacts.length})</h1>
                    <Link
                        href="/app/contacts/new"
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-nearby-dark rounded-xl hover:bg-nearby-dark-600 transition-colors"
                    >
                        Nuevo Contacto
                    </Link>
                </div>
                <ContactsTable contacts={serializedContacts} initialPreferences={preferences} itemsPerPage={itemsPerPage as 10 | 25 | 50} />
            </div>
        </div>
    );
}
