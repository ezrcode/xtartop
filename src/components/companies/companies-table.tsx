"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { DataTable, Column, TablePreferences, ItemsPerPage } from "@/components/ui/data-table";
import { saveTablePreferences } from "@/actions/table-preferences";
import { CompanyStatus, CompanyType } from "@prisma/client";

interface Company {
    id: string;
    name: string;
    logoUrl: string | null;
    city: string | null;
    country: string | null;
    status: CompanyStatus;
    type: CompanyType;
    createdAt: Date;
    primaryContact: {
        id: string;
        fullName: string;
    } | null;
}

interface CompaniesTableProps {
    companies: Company[];
    initialPreferences: TablePreferences | null;
    itemsPerPage?: 10 | 25 | 50;
}

const statusConfig: Record<CompanyStatus, { label: string; className: string; dotColor: string }> = {
    ACTIVO: { label: "Activo", className: "bg-success-green/10 text-success-green", dotColor: "bg-success-green" },
    INACTIVO: { label: "Inactivo", className: "bg-[var(--surface-3)] text-[var(--muted-text)]", dotColor: "bg-gray-300" },
};

const typeConfig: Record<CompanyType, { label: string; className: string }> = {
    PROSPECTO: { label: "Prospecto", className: "bg-[var(--surface-3)] text-gray-800 dark:text-gray-300" },
    POTENCIAL: { label: "Potencial", className: "bg-nearby-dark/8 text-nearby-dark dark:text-nearby-dark-300" },
    CLIENTE_SUSCRIPTOR: { label: "Cliente Suscriptor", className: "bg-success-green/10 text-success-green" },
    CLIENTE_ONETIME: { label: "Cliente One-Time", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
    PROVEEDOR: { label: "Proveedor", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
    INVERSIONISTA: { label: "Inversionista", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
    COMPETIDOR: { label: "Competidor", className: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300" },
    NO_CALIFICA: { label: "No Califica", className: "bg-[var(--surface-3)] text-[var(--muted-text)]" },
    NO_RESPONDIO: { label: "No Respondió", className: "bg-[var(--surface-3)] text-[var(--muted-text)]" },
    DESISTIO: { label: "Desistió", className: "bg-[var(--surface-3)] text-[var(--muted-text)]" },
    RESCINDIO_CONTRATO: { label: "Rescindió Contrato", className: "bg-error-red/10 text-error-red" },
    SIN_MOTIVO: { label: "Sin Motivo", className: "bg-[var(--surface-3)] text-[var(--muted-text)]" },
};

function getCompanyInitials(name: string): string {
    return name.trim().substring(0, 2).toUpperCase();
}

export function CompaniesTable({ companies, initialPreferences, itemsPerPage = 10 }: CompaniesTableProps) {
    const router = useRouter();

    const columns: Column<Company>[] = [
        {
            key: "logo",
            header: "",
            hideable: false,
            className: "w-14",
            render: (company) => (
                <div className="w-10 h-10 rounded-lg border border-[var(--card-border)] overflow-hidden flex items-center justify-center">
                    {company.logoUrl ? (
                        <Image
                            src={company.logoUrl}
                            alt={company.name}
                            width={40}
                            height={40}
                            className="object-contain"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-nearby-dark/10 to-nearby-dark/5 flex items-center justify-center">
                            <span className="text-[var(--foreground)] font-bold text-sm">
                                {getCompanyInitials(company.name)}
                            </span>
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: "name",
            header: "Nombre",
            sortable: true,
            hideable: false,
            render: (company) => (
                <Link
                    href={`/app/companies/${company.id}`}
                    className="group block"
                    onClick={(e) => e.stopPropagation()}
                >
                    <span className="text-sm font-medium text-[var(--foreground)] group-hover:underline">
                        {company.name}
                    </span>
                    {company.city && (
                        <span className="block text-xs text-[var(--muted-text)] truncate max-w-[220px]">
                            {company.city}
                        </span>
                    )}
                </Link>
            ),
        },
        {
            key: "city",
            header: "Ciudad",
            sortable: true,
            hideable: true,
            defaultVisible: true,
            render: (company) => (
                <span className="text-sm text-[var(--foreground)]">{company.city || "-"}</span>
            ),
        },
        {
            key: "country",
            header: "País",
            sortable: true,
            hideable: true,
            defaultVisible: true,
            render: (company) => (
                <span className="text-sm text-[var(--foreground)]">{company.country || "-"}</span>
            ),
        },
        {
            key: "primaryContact",
            header: "Contacto Principal",
            hideable: true,
            defaultVisible: true,
            render: (company) => (
                company.primaryContact ? (
                    <Link
                        href={`/app/contacts/${company.primaryContact.id}`}
                        className="text-sm text-[var(--foreground)] font-medium hover:underline"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {company.primaryContact.fullName}
                    </Link>
                ) : (
                    <span className="text-sm text-[var(--muted-text)]">-</span>
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
            render: (company) => {
                const config = statusConfig[company.status];
                return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.className}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
                        {config.label}
                    </span>
                );
            },
        },
        {
            key: "type" as keyof Company,
            header: "Tipo",
            sortable: true,
            filterable: true,
            filterOptions: Object.entries(typeConfig).map(([value, { label }]) => ({
                value,
                label,
            })),
            hideable: true,
            defaultVisible: true,
            render: (company) => {
                const config = typeConfig[company.type];
                return (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${config.className}`}>
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
            render: (company) => (
                <span className="text-sm text-[var(--muted-text)]">
                    {new Date(company.createdAt).toLocaleDateString('es-ES')}
                </span>
            ),
        },
    ];

    const handleSavePreferences = async (prefs: TablePreferences) => {
        await saveTablePreferences("companies", prefs);
    };

    if (companies.length === 0) {
        return (
            <div className="bg-[var(--card-bg)] shadow-sm rounded-lg border border-[var(--card-border)] overflow-hidden">
                <div className="text-center py-12 px-4">
                    <p className="text-[var(--foreground)] text-base sm:text-lg">No hay empresas registradas</p>
                    <Link
                        href="/app/companies/new"
                        className="inline-flex items-center px-4 py-2 mt-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-nearby-dark hover:bg-nearby-dark-600"
                    >
                        <Plus size={16} className="mr-2" />
                        Agregar primera empresa
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
                    data={companies}
                    columns={columns}
                    keyExtractor={(company) => company.id}
                    onRowClick={(company) => router.push(`/app/companies/${company.id}`)}
                    searchable
                    searchPlaceholder="Buscar empresas..."
                    searchKeys={["name", "city", "country"]}
                    initialPreferences={initialPreferences || undefined}
                    onSavePreferences={handleSavePreferences}
                    paginated
                    itemsPerPage={itemsPerPage}
                />
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden bg-[var(--card-bg)] shadow-sm rounded-lg border border-[var(--card-border)] overflow-hidden divide-y divide-graphite-gray">
                {companies.map((company) => {
                    const config = statusConfig[company.status];
                    return (
                        <Link
                            key={company.id}
                            href={`/app/companies/${company.id}`}
                            className="block p-4 hover:bg-soft-gray transition-colors"
                        >
                            <div className="flex items-start gap-3 mb-2">
                                <div className="w-10 h-10 rounded-lg border border-[var(--card-border)] overflow-hidden flex items-center justify-center flex-shrink-0">
                                    {company.logoUrl ? (
                                        <Image
                                            src={company.logoUrl}
                                            alt={company.name}
                                            width={40}
                                            height={40}
                                            className="object-contain"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-nearby-dark/10 to-nearby-dark/5 flex items-center justify-center">
                                            <span className="text-[var(--foreground)] font-bold text-sm">
                                                {getCompanyInitials(company.name)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between">
                                        <div className="min-w-0">
                                            <h3 className="text-base font-medium text-[var(--foreground)] truncate">
                                                {company.name}
                                            </h3>
                                            {company.city && (
                                                <p className="text-xs text-[var(--muted-text)]">{company.city}</p>
                                            )}
                                        </div>
                                        <div className="ml-2 flex items-center gap-1.5 flex-shrink-0">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${config.className}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
                                                {config.label}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium ${typeConfig[company.type].className}`}>
                                            {typeConfig[company.type].label}
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-sm text-[var(--foreground)] mt-1">
                                        {company.country && (
                                            <p>
                                                <span className="font-medium">País:</span> {company.country}
                                            </p>
                                        )}
                                        {company.primaryContact && (
                                            <p>
                                                <span className="font-medium">Contacto:</span> {company.primaryContact.fullName}
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
