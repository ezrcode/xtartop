"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { DataTable, Column, TablePreferences, ItemsPerPage } from "@/components/ui/data-table";
import { saveTablePreferences } from "@/actions/table-preferences";
import { ContactStatus } from "@prisma/client";

interface Contact {
    id: string;
    fullName: string;
    email: string;
    mobile: string | null;
    receivesInvoices: boolean;
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
    itemsPerPage?: ItemsPerPage;
}

const statusConfig: Record<ContactStatus, { label: string; className: string; dotColor: string }> = {
    CLIENTE: { label: "Cliente", className: "bg-success-green/10 text-success-green", dotColor: "bg-success-green" },
    PROSPECTO: { label: "Prospecto", className: "bg-blue-100 text-blue-800", dotColor: "bg-blue-500" },
    POTENCIAL: { label: "Potencial", className: "bg-warning-amber/10 text-warning-amber", dotColor: "bg-warning-amber" },
    INVERSIONISTA: { label: "Inversionista", className: "bg-purple-100 text-purple-800", dotColor: "bg-purple-500" },
    DESCARTADO: { label: "Descartado", className: "bg-gray-100 text-gray-800", dotColor: "bg-gray-400" },
};

function getInitials(fullName: string): string {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (parts[0]?.[0] ?? "").toUpperCase();
}

export function ContactsTable({ contacts, initialPreferences, itemsPerPage = 10 }: ContactsTableProps) {
    const router = useRouter();

    const columns: Column<Contact>[] = [
        {
            key: "avatar",
            header: "",
            hideable: false,
            className: "w-12",
            render: (contact) => (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-nearby-accent to-nearby-accent-600 text-white flex items-center justify-center text-xs font-semibold">
                    {getInitials(contact.fullName)}
                </div>
            ),
        },
        {
            key: "fullName",
            header: "Nombre completo",
            sortable: true,
            hideable: false,
            render: (contact) => (
                <Link
                    href={`/app/contacts/${contact.id}`}
                    className="group block"
                    onClick={(e) => e.stopPropagation()}
                >
                    <span className="text-sm font-medium text-nearby-accent group-hover:underline">
                        {contact.fullName}
                    </span>
                    <span className="block text-xs text-[var(--muted-text)] truncate max-w-[220px]">
                        {contact.email}
                    </span>
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
            key: "receivesInvoices",
            header: "Recibe facturas",
            sortable: true,
            hideable: true,
            defaultVisible: false,
            render: (contact) => (
                contact.receivesInvoices ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-success-green/10">
                        <Check size={14} className="text-success-green" />
                    </span>
                ) : (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100">
                        <X size={14} className="text-gray-400" />
                    </span>
                )
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
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
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
                    paginated
                    itemsPerPage={itemsPerPage}
                />
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden bg-white border border-graphite-gray rounded-lg shadow-sm overflow-hidden divide-y divide-graphite-gray min-w-0">
                {contacts.map((contact) => {
                    const config = statusConfig[contact.status];
                    return (
                        <Link
                            key={contact.id}
                            href={`/app/contacts/${contact.id}`}
                            className="block p-4 hover:bg-soft-gray transition-colors min-w-0 overflow-hidden"
                        >
                            <div className="flex items-start gap-3 mb-2">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-nearby-accent to-nearby-accent-600 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                    {getInitials(contact.fullName)}
                                </div>
                                <div className="flex-1 min-w-0 space-y-1.5">
                                    <h3 className="text-base font-semibold text-nearby-accent truncate">
                                        {contact.fullName}
                                    </h3>
                                    <div>
                                        <span className={`inline-flex max-w-full items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${config.className}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor} flex-shrink-0`} />
                                            <span className="truncate">{config.label}</span>
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-sm text-dark-slate mt-1">
                                        {contact.company && (
                                            <p className="truncate">
                                                <span className="font-medium">Empresa:</span> {contact.company.name}
                                            </p>
                                        )}
                                        {contact.email && (
                                            <p className="truncate">
                                                <span className="font-medium">Email:</span> {contact.email}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </>
    );
}
