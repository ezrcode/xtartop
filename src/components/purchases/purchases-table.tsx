"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { PurchaseOrderStatus } from "@prisma/client";

interface PurchaseOrder {
    id: string;
    orderNumber: number;
    period: string;
    status: PurchaseOrderStatus;
    decimaOrderId: string | null;
    decimaStatus: string | null;
    externalReference: string | null;
    createdAt: Date;
    supplier: {
        id: string;
        name: string;
        logoUrl: string | null;
    };
    createdBy: {
        id: string;
        name: string | null;
    };
    _count: {
        items: number;
    };
}

interface PurchasesTableProps {
    orders: PurchaseOrder[];
}

const statusConfig: Record<PurchaseOrderStatus, { label: string; className: string; dotColor: string }> = {
    BORRADOR: { label: "Borrador", className: "bg-[var(--surface-3)] text-gray-800", dotColor: "bg-gray-400" },
    ENVIADA: { label: "Enviada", className: "bg-nearby-accent/10 text-nearby-accent", dotColor: "bg-nearby-accent" },
    CONFIRMADA: { label: "Confirmada", className: "bg-success-green/10 text-success-green", dotColor: "bg-success-green" },
    RECIBIDA: { label: "Recibida", className: "bg-purple-100 text-purple-800", dotColor: "bg-purple-500" },
    CANCELADA: { label: "Cancelada", className: "bg-error-red/10 text-error-red", dotColor: "bg-error-red" },
};

export function PurchasesTable({ orders }: PurchasesTableProps) {
    const router = useRouter();

    if (orders.length === 0) {
        return (
            <div className="bg-[var(--card-bg)] shadow-sm rounded-lg border border-[var(--card-border)] p-12 text-center">
                <p className="text-[var(--muted-text)] text-sm">No hay órdenes de compra aún.</p>
                <Link
                    href="/app/purchases/new"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-medium text-white bg-nearby-dark rounded-lg hover:bg-nearby-dark-600 transition-colors"
                >
                    Crear primera orden
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-[var(--card-bg)] shadow-sm rounded-lg border border-[var(--card-border)] overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[var(--card-border)] bg-[var(--hover-bg)]">
                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">
                                # Orden
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">
                                Proveedor
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">
                                Periodo
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">
                                Items
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">
                                Estado
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">
                                Décima
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">
                                Fecha
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--card-border)]">
                        {orders.map((order) => {
                            const config = statusConfig[order.status];
                            return (
                                <tr
                                    key={order.id}
                                    onClick={() => router.push(`/app/purchases/${order.id}`)}
                                    className="hover:bg-[var(--hover-bg)] cursor-pointer transition-colors"
                                >
                                    <td className="px-4 py-3 text-sm font-medium text-[var(--foreground)]">
                                        OC-{String(order.orderNumber).padStart(4, "0")}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                                        {order.supplier.name}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-[var(--muted-text)]">
                                        {order.period}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-[var(--muted-text)]">
                                        {order._count.items}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
                                            {config.label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-[var(--muted-text)]">
                                        {order.decimaOrderId ? (
                                            <span className="font-mono text-xs">{order.decimaStatus || "Enviada"}</span>
                                        ) : (
                                            <span className="text-xs text-[var(--muted-text)]">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-[var(--muted-text)]">
                                        {new Date(order.createdAt).toLocaleDateString("es-DO", {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric",
                                        })}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
