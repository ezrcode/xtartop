"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Download, FileText, ExternalLink, Printer, Trash2 } from "lucide-react";
import { getBillingHistory, deleteBillingHistoryEntry, type BillingHistoryItem } from "@/actions/billing-history";
import { formatMoney } from "@/lib/format";

interface BillingHistoryTabProps {
    companyId: string;
}

const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function StatusBadge({ status }: { status: BillingHistoryItem["status"] }) {
    const configs = {
        PENDING: { label: "Pendiente", dot: "bg-amber-500", text: "text-amber-700" },
        SENT: { label: "Enviada", dot: "bg-emerald-500", text: "text-emerald-700" },
        FAILED: { label: "Fallida", dot: "bg-red-500", text: "text-red-700" },
        CANCELLED: { label: "Cancelada", dot: "bg-gray-400", text: "text-gray-500" },
    };

    const config = configs[status];

    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${config.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot} shrink-0`} />
            {config.label}
        </span>
    );
}

export function BillingHistoryTab({ companyId }: BillingHistoryTabProps) {
    const [history, setHistory] = useState<BillingHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        const result = await deleteBillingHistoryEntry(id);
        if (result.success) {
            setHistory((prev) => prev.filter((h) => h.id !== id));
        }
        setDeletingId(null);
        setConfirmDeleteId(null);
    };

    const handlePrint = (pdfUrl: string) => {
        const printWindow = window.open(pdfUrl, "_blank");
        if (printWindow) {
            printWindow.addEventListener("load", () => {
                printWindow.print();
            });
        }
    };

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
                    Las proformas generadas desde este CRM aparecerán aquí
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <div className="flex items-center justify-between">
                    <h3 className="text-md font-semibold text-[var(--foreground)]">
                        Historial de Proformas
                    </h3>
                    <span className="text-sm text-[var(--muted-text)]">
                        {history.length} registro{history.length !== 1 ? "s" : ""}
                    </span>
                </div>
                <p className="text-xs text-[var(--muted-text)] mt-0.5">
                    Proformas generadas desde el CRM interno. Las creadas directamente en ADMCloud no aparecen aquí.
                </p>
            </div>

            <div className="border border-[var(--card-border)] rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm table-fixed">
                        <colgroup>
                            <col style={{ width: "80px" }} />
                            <col style={{ width: "130px" }} />
                            <col style={{ width: "85px" }} />
                            <col style={{ width: "110px" }} />
                            <col style={{ width: "100px" }} />
                            <col style={{ width: "130px" }} />
                        </colgroup>
                        <thead className="bg-[var(--hover-bg)]">
                            <tr>
                                <th className="px-3 py-3 text-left text-xs font-medium text-[var(--muted-text)] uppercase">
                                    Período
                                </th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-[var(--muted-text)] uppercase">
                                    Nro. Proforma
                                </th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-[var(--muted-text)] uppercase">
                                    Estado
                                </th>
                                <th className="px-3 py-3 text-right text-xs font-medium text-[var(--muted-text)] uppercase">
                                    Total
                                </th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-[var(--muted-text)] uppercase">
                                    Fecha
                                </th>
                                <th className="px-3 py-3 text-center text-xs font-medium text-[var(--muted-text)] uppercase">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--card-border)]">
                            {history.map((item) => (
                                <tr key={item.id} className="hover:bg-[var(--hover-bg)]">
                                    <td className="px-3 py-2.5 text-[var(--foreground)] text-xs">
                                        {monthNames[item.billingMonth - 1]} {item.billingYear}
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <span className="text-[var(--foreground)] font-mono text-xs block truncate" title={item.proformaNumber || undefined}>
                                            {item.proformaNumber || "-"}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <StatusBadge status={item.status} />
                                        {item.errorMessage && (
                                            <p className="text-[10px] text-red-600 mt-0.5 truncate" title={item.errorMessage}>
                                                {item.errorMessage}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-3 py-2.5 text-right text-[var(--foreground)] font-medium font-mono tabular-nums text-xs">
                                        {formatMoney(item.totalAmount)} {item.currency}
                                    </td>
                                    <td className="px-3 py-2.5 text-[var(--muted-text)] text-xs">
                                        <div className="flex flex-col">
                                            <span>
                                                {new Date(item.generatedAt).toLocaleDateString("es-DO", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric",
                                                })}
                                            </span>
                                            {item.sentAt && (
                                                <span className="text-emerald-600">
                                                    Env: {new Date(item.sentAt).toLocaleDateString("es-DO", {
                                                        day: "2-digit",
                                                        month: "short",
                                                    })}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <div className="flex items-center justify-center gap-1">
                                            {item.pdfUrl && (
                                                <>
                                                    <a
                                                        href={item.pdfUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 text-[var(--muted-text)] hover:text-nearby-accent rounded-lg hover:bg-nearby-accent/10 transition-colors"
                                                        title="Descargar PDF"
                                                    >
                                                        <Download size={15} />
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => handlePrint(item.pdfUrl!)}
                                                        className="p-1.5 text-[var(--muted-text)] hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                                                        title="Reimprimir"
                                                    >
                                                        <Printer size={15} />
                                                    </button>
                                                </>
                                            )}
                                            {item.admCloudDocId && (
                                                <a
                                                    href={`https://app.admcloud.com/quotes/${item.admCloudDocId}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 text-[var(--muted-text)] hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                                                    title="Ver en ADMCloud"
                                                >
                                                    <ExternalLink size={15} />
                                                </a>
                                            )}
                                            {confirmDeleteId === item.id ? (
                                                <div className="flex items-center gap-1 ml-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(item.id)}
                                                        disabled={deletingId === item.id}
                                                        className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                                                    >
                                                        {deletingId === item.id ? "..." : "Sí"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmDeleteId(null)}
                                                        className="px-2 py-1 text-xs font-medium text-[var(--foreground)] bg-[var(--hover-bg)] rounded"
                                                    >
                                                        No
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmDeleteId(item.id)}
                                                    className="p-1.5 text-[var(--muted-text)] hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
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
