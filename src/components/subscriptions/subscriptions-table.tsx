"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format";

interface SubscriptionRow {
    companyId: string;
    companyName: string;
    itemsCount: number;
    mrr: number;
    billingDay: number;
    autoBilling: boolean;
    projects: number;
    users: number;
}

interface SubscriptionsTableProps {
    subscriptions: SubscriptionRow[];
}

export function SubscriptionsTable({ subscriptions }: SubscriptionsTableProps) {
    const router = useRouter();

    const columns: Column<SubscriptionRow>[] = [
        {
            key: "companyName",
            header: "Empresa",
            sortable: true,
            render: (item) => (
                <span className="text-sm font-medium text-[var(--foreground)]">
                    {item.companyName}
                </span>
            ),
        },
        {
            key: "itemsCount",
            header: "Items",
            sortable: true,
            render: (item) => (
                <span className="text-sm text-[var(--muted-text)]">
                    {item.itemsCount}
                </span>
            ),
        },
        {
            key: "mrr",
            header: "MRR",
            sortable: true,
            render: (item) => (
                <span className="text-sm font-mono tabular-nums font-medium text-[var(--foreground)]">
                    {formatMoney(item.mrr)}
                </span>
            ),
        },
        {
            key: "billingDay",
            header: "Día",
            sortable: true,
            render: (item) => (
                <span className="text-sm font-mono tabular-nums text-[var(--muted-text)]">
                    {item.billingDay}
                </span>
            ),
        },
        {
            key: "autoBilling",
            header: "Auto",
            sortable: true,
            render: (item) => (
                <Badge variant={item.autoBilling ? "success" : "secondary"}>
                    {item.autoBilling ? "Sí" : "No"}
                </Badge>
            ),
        },
        {
            key: "projects",
            header: "Proyectos",
            sortable: true,
            render: (item) => (
                <span className="text-sm text-[var(--muted-text)]">{item.projects}</span>
            ),
        },
        {
            key: "users",
            header: "Usuarios",
            sortable: true,
            render: (item) => (
                <span className="text-sm text-[var(--muted-text)]">{item.users}</span>
            ),
        },
    ];

    return (
        <DataTable
            data={subscriptions}
            columns={columns}
            keyExtractor={(item) => item.companyId}
            onRowClick={(item) => router.push(`/app/subscriptions/${item.companyId}`)}
            searchable
            searchPlaceholder="Buscar empresa..."
            searchKeys={["companyName" as keyof SubscriptionRow]}
            emptyState={
                <div className="text-center py-12">
                    <p className="text-[var(--muted-text)]">No hay suscripciones configuradas</p>
                </div>
            }
        />
    );
}
