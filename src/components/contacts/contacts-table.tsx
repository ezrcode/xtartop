"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { DataTable, Column, TablePreferences } from "@/components/ui/data-table";
import { saveTablePreferences } from "@/actions/table-preferences";
import { ContactStatus } from "@prisma/client";

interface Contact {
    id: string;
    fullName: string;
    email: string;
    mobile: string | null;
    status: ContactStatus;
    createdAt: Date;
    company: {
        id: string;
        name: string;
    } | null;
}

interface ContactsTableProps {
    contacts: Contact[];
    initialPreferences: TablePreferences | null;
}

const statusConfig: Record<ContactStatus, { label: string; className: string }> = {
    CLIENTE: { label: "Cliente", className: "bg-success-green/10 text-success-green" },
    PROSPECTO: { label: "Prospecto", className: "bg-blue-100 text-blue-800" },
    POTENCIAL: { label: "Potencial", className: "bg-warning-amber/10 text-warning-amber" },
    INVERSIONISTA: { label: "Inversionista", className: "bg-purple-100 text-purple-800" },
    DESCARTADO: { label: "Descartado", className: "bg-gray-100 text-gray-800" },
};

export function ContactsTable({ contacts, initialPreferences }: ContactsTableProps) {
    const router = useRouter();

    const columns: Column<Contact>[] = [
        {
            key: "fullName",
            header: "Nombre completo",
            sortable: true,
            hideable: false,
            render: (contact) => (
                <Link
                    href={`/app/contacts/${contact.id}`}
                    className="text-sm font-medium text-nearby-accent hover:underline"
                    onClick={(e) => e.stopPropagation()}
                >
                    {contact.fullName}
                </Link>
            ),
        },
        {
            key: "company",
            header: "Empresa",
            sortable: false,
            hideable: true,
            defaultVisible: true,
            render: (contact) => (
                contact.company ? (
                    <Link
                        href={`/app/companies/${contact.company.id}`}
                        className="text-sm text-nearby-accent hover:underline"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {contact.company.name}
                    </Link>
                ) : (
                    <span className="text-gray-400 italic text-sm">Sin empresa</span>
                )
            ),
        },
        {
            key: "email",
            header: "Correo electrónico",
            sortable: true,
            hideable: true,
            defaultVisible: true,
            render: (contact) => (
                <span className="text-sm text-dark-slate">{contact.email}</span>
            ),
        },
        {
            key: "mobile",
            header: "Teléfono",
            sortable: false,
            hideable: true,
            defaultVisible: false,
            render: (contact) => (
                <span className="text-sm text-dark-slate">{contact.mobile || "-"}</span>
            ),
        },
        {
            key: "status",
            header: "Estado",
            sortable: true,
            filterable: true,
            filterOptions: Object.entries(statusConfig).map(([value, { label }]) => ({
                value,
                label,
            })),
            hideable: true,
            defaultVisible: true,
            render: (contact) => {
                const config = statusConfig[contact.status];
                return (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
                        {config.label}
                    </span>
                );
            },
        },
        {
            key: "createdAt",
            header: "Fecha de creación",
            sortable: true,
            hideable: true,
            defaultVisible: false,
            render: (contact) => (
                <span className="text-sm text-gray-500">
                    {new Date(contact.createdAt).toLocaleDateString('es-ES')}
                </span>
            ),
        },
    ];

    const handleSavePreferences = async (prefs: TablePreferences) => {
        await saveTablePreferences("contacts", prefs);
    };

    if (contacts.length === 0) {
        return (
            <div className="bg-white border border-graphite-gray rounded-lg shadow-sm overflow-hidden">
                <div className="p-8 sm:p-12 text-center">
                    <h3 className="text-base sm:text-lg font-medium text-dark-slate mb-2">No hay contactos aún</h3>
                    <p className="text-sm sm:text-base text-gray-500 mb-6">Comienza creando tu primer contacto.</p>
                    <Link
                        href="/app/contacts/new"
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-nearby-accent bg-nearby-accent/10 rounded-md hover:bg-nearby-accent/20 transition-colors"
                    >
                        Crear contacto
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Desktop Table View */}
            <div className="hidden md:block">
                <DataTable
                    data={contacts}
                    columns={columns}
                    keyExtractor={(contact) => contact.id}
                    onRowClick={(contact) => router.push(`/app/contacts/${contact.id}`)}
                    searchable
                    searchPlaceholder="Buscar contactos..."
                    searchKeys={["fullName", "email"]}
                    initialPreferences={initialPreferences || undefined}
                    onSavePreferences={handleSavePreferences}
                />
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden bg-white border border-graphite-gray rounded-lg shadow-sm overflow-hidden divide-y divide-graphite-gray">
                {contacts.map((contact) => (
                    <Link
                        key={contact.id}
                        href={`/app/contacts/${contact.id}`}
                        className="block p-4 hover:bg-soft-gray transition-colors"
                    >
                        <div className="flex items-start justify-between mb-2">
                            <h3 className="text-base font-semibold text-nearby-accent">
                                {contact.fullName}
                            </h3>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[contact.status].className}`}>
                                {statusConfig[contact.status].label}
                            </span>
                        </div>
                        <div className="space-y-1 text-sm text-dark-slate">
                            {contact.company && (
                                <p>
                                    <span className="font-medium">Empresa:</span> {contact.company.name}
                                </p>
                            )}
                            {contact.email && (
                                <p className="truncate">
                                    <span className="font-medium">Email:</span> {contact.email}
                                </p>
                            )}
                        </div>
                    </Link>
                ))}
            </div>
        </>
    );
}
