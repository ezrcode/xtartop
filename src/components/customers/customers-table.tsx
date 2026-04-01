"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { DataTable, type Column } from "@/components/ui/data-table";
import { CompanyType } from "@prisma/client";

interface CustomerRow {
    id: string;
    name: string;
    logoUrl: string | null;
    type: CompanyType;
    contactName: string | null;
    projects: number;
    users: number;
}

interface CustomersTableProps {
    customers: CustomerRow[];
}

const typeLabels: Record<string, { label: string; className: string }> = {
    CLIENTE_SUSCRIPTOR: { label: "Suscriptor", className: "bg-success-green/10 text-success-green" },
    CLIENTE_ONETIME: {
        label: "One-Time",
        className:
            "border border-[var(--card-border)] bg-[var(--surface-2)] text-[var(--foreground)] dark:bg-[var(--surface-3)]",
    },
};

function getInitials(name: string) {
    return name.trim().substring(0, 2).toUpperCase();
}

export function CustomersTable({ customers }: CustomersTableProps) {
    const router = useRouter();

    const columns: Column<CustomerRow>[] = [
        {
            key: "logo" as keyof CustomerRow,
            header: "",
            hideable: false,
            className: "w-14",
            render: (c) => (
                <div className="w-10 h-10 rounded-lg border border-[var(--card-border)] overflow-hidden flex items-center justify-center">
                    {c.logoUrl ? (
                        <Image src={c.logoUrl} alt={c.name} width={40} height={40} className="object-contain" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-nearby-dark/10 to-nearby-dark/5 flex items-center justify-center">
                            <span className="text-[var(--foreground)] font-bold text-sm">{getInitials(c.name)}</span>
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: "name",
            header: "Empresa",
            sortable: true,
            hideable: false,
            render: (c) => (
                <Link
                    href={`/app/customers/${c.id}`}
                    className="group block"
                    onClick={(e) => e.stopPropagation()}
                >
                    <span className="text-sm font-medium text-[var(--foreground)] group-hover:underline">{c.name}</span>
                </Link>
            ),
        },
        {
            key: "type",
            header: "Tipo",
            sortable: true,
            filterable: true,
            filterOptions: [
                { value: "CLIENTE_SUSCRIPTOR", label: "Suscriptor" },
                { value: "CLIENTE_ONETIME", label: "One-Time" },
            ],
            hideable: true,
            defaultVisible: true,
            render: (c) => {
                const cfg = typeLabels[c.type] || typeLabels.CLIENTE_SUSCRIPTOR;
                return (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${cfg.className}`}>
                        {cfg.label}
                    </span>
                );
            },
        },
        {
            key: "contactName" as keyof CustomerRow,
            header: "Contacto",
            hideable: true,
            defaultVisible: true,
            render: (c) => (
                <span className="text-sm text-[var(--muted-text)]">{c.contactName || "-"}</span>
            ),
        },
        {
            key: "projects",
            header: "Proyectos",
            sortable: true,
            hideable: true,
            defaultVisible: true,
            render: (c) => <span className="text-sm text-[var(--muted-text)]">{c.projects}</span>,
        },
        {
            key: "users",
            header: "Usuarios",
            sortable: true,
            hideable: true,
            defaultVisible: true,
            render: (c) => <span className="text-sm text-[var(--muted-text)]">{c.users}</span>,
        },
    ];

    return (
        <DataTable
            data={customers}
            columns={columns}
            keyExtractor={(c) => c.id}
            onRowClick={(c) => router.push(`/app/customers/${c.id}`)}
            searchable
            searchPlaceholder="Buscar cliente..."
            searchKeys={["name" as keyof CustomerRow]}
            emptyState={
                <div className="text-center py-12">
                    <p className="text-[var(--muted-text)]">No hay clientes activos</p>
                </div>
            }
        />
    );
}
