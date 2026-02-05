"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Download, CheckCircle, XCircle, Clock, AlertTriangle, FileText, ExternalLink } from "lucide-react";
import { getBillingHistory, type BillingHistoryItem } from "@/actions/billing-history";
import { formatMoney } from "@/lib/format";

interface BillingHistoryTabProps {
    companyId: string;
}

const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function StatusBadge({ status }: { status: BillingHistoryItem["status"] }) {
    const configs = {
        PENDING: {
            icon: Clock,
            label: "Pendiente",
            className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        },
        SENT: {
            icon: CheckCircle,
            label: "Enviada",
            className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        },
        FAILED: {
            icon: XCircle,
            label: "Fallida",
            className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        },
        CANCELLED: {
            icon: AlertTriangle,
            label: "Cancelada",
            className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
        },
    };

    const config = configs[status];
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
            <Icon size={12} />
            {config.label}
        </span>
    );
}

export function BillingHistoryTab({ companyId }: BillingHistoryTabProps) {
    const [history, setHistory] = useState<BillingHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    const loadHistory = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getBillingHistory(companyId);
            setHistory(data);
        } catch (error) {
            console.error("Error loading billing history:", error);
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-nearby-accent" size={24} />
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="text-center py-12">
                <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No hay historial de proformas</p>
                <p className="text-gray-400 text-sm mt-1">
                    Las proformas generadas aparecerán aquí
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-md font-semibold text-[var(--foreground)]">
                    Historial de Proformas
                </h3>
                <span className="text-sm text-[var(--muted-text)]">
                    {history.length} registro{history.length !== 1 ? "s" : ""}
                </span>
            </div>

            <div className="border border-[var(--card-border)] rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-[var(--hover-bg)]">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted-text)] uppercase">
                                    Período
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted-text)] uppercase">
                                    Nro. Proforma
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted-text)] uppercase">
                                    Estado
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-[var(--muted-text)] uppercase">
                                    Total
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted-text)] uppercase">
                                    Fecha
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-[var(--muted-text)] uppercase">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--card-border)]">
                            {history.map((item) => (
                                <tr key={item.id} className="hover:bg-[var(--hover-bg)]">
                                    <td className="px-4 py-3 text-[var(--foreground)]">
                                        {monthNames[item.billingMonth - 1]} {item.billingYear}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="text-[var(--foreground)] font-mono text-xs">
                                                {item.proformaNumber || "-"}
                                            </span>
                                            {item.admCloudDocId && (
                                                <span className="text-[var(--muted-text)] text-xs">
                                                    ADMCloud: {item.admCloudDocId}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge status={item.status} />
                                        {item.errorMessage && (
                                            <p className="text-xs text-red-600 mt-1 max-w-xs truncate" title={item.errorMessage}>
                                                {item.errorMessage}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right text-[var(--foreground)] font-medium">
                                        {formatMoney(item.totalAmount)} {item.currency}
                                    </td>
                                    <td className="px-4 py-3 text-[var(--muted-text)] text-xs">
                                        <div className="flex flex-col">
                                            <span>
                                                {new Date(item.generatedAt).toLocaleDateString("es-DO", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric",
                                                })}
                                            </span>
                                            {item.sentAt && (
                                                <span className="text-green-600">
                                                    Enviado: {new Date(item.sentAt).toLocaleDateString("es-DO", {
                                                        day: "2-digit",
                                                        month: "short",
                                                    })}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {item.pdfUrl && (
                                                <a
                                                    href={item.pdfUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 text-[var(--muted-text)] hover:text-nearby-accent rounded transition-colors"
                                                    title="Descargar PDF"
                                                >
                                                    <Download size={16} />
                                                </a>
                                            )}
                                            {item.admCloudDocId && (
                                                <a
                                                    href={`https://app.admcloud.com/quotes/${item.admCloudDocId}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 text-[var(--muted-text)] hover:text-blue-600 rounded transition-colors"
                                                    title="Ver en ADMCloud"
                                                >
                                                    <ExternalLink size={16} />
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Summary */}
            <div className="flex flex-wrap gap-4 text-xs text-[var(--muted-text)]">
                <span>
                    Enviadas: {history.filter(h => h.status === "SENT").length}
                </span>
                <span>
                    Pendientes: {history.filter(h => h.status === "PENDING").length}
                </span>
                <span>
                    Fallidas: {history.filter(h => h.status === "FAILED").length}
                </span>
            </div>
        </div>
    );
}
