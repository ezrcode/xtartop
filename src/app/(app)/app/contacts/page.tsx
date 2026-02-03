import { getContacts } from "@/actions/contacts";
import { getTablePreferences } from "@/actions/table-preferences";
import { getUserItemsPerPage } from "@/actions/profile";
import { ContactsTable } from "@/components/contacts/contacts-table";
import Link from "next/link";
import { Plus } from "lucide-react";

// Cache for 30 seconds - good balance for list pages
export const revalidate = 30;

export default async function ContactsPage() {
    const [contacts, preferences, itemsPerPage] = await Promise.all([
        getContacts(),
        getTablePreferences("contacts"),
        getUserItemsPerPage(),
    ]);

    return (
        <div className="min-h-screen bg-soft-gray py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-nearby-dark">Contactos</h1>
                        <p className="text-dark-slate mt-2 text-sm sm:text-base">
                            Gestiona tu red de contactos
                        </p>
                    </div>
                    <Link
                        href="/app/contacts/new"
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-nearby-dark rounded-md hover:bg-gray-900 transition-colors"
                    >
                        <Plus size={16} className="mr-2" />
                        Nuevo
                    </Link>
                </div>

                {/* Contacts Table */}
                <ContactsTable contacts={contacts} initialPreferences={preferences} itemsPerPage={itemsPerPage as 10 | 25 | 50} />
            </div>
        </div>
    );
}
