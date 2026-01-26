"use client";

import { useState, useEffect, useTransition } from "react";
import { 
    FileText, 
    RefreshCw, 
    AlertCircle, 
    Cloud, 
    CloudOff,
    ExternalLink,
    DollarSign,
    Calendar,
    Hash,
    Loader2,
    Link2,
    CheckCircle
} from "lucide-react";
import { getCompanyInvoices, syncCompanyWithAdmCloud } from "@/actions/admcloud";
import type { AdmCloudInvoice } from "@/lib/admcloud/client";

interface InvoicesTabProps {
    companyId: string;
    companyName: string;
    taxId: string | null;
    admCloudRelationshipId: string | null;
    admCloudLastSync: Date | null;
}

function formatCurrency(amount: number, currency: string = "DOP"): string {
    return new Intl.NumberFormat("es-DO", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2,
    }).format(amount);
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-DO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function getStatusBadge(status: string) {
    const statusLower = status?.toLowerCase() || "";
    if (statusLower.includes("paid") || statusLower.includes("pagad")) {
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Pagada
            </span>
        );
    } else if (statusLower.includes("pending") || statusLower.includes("pendiente")) {
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Pendiente
            </span>
        );
    } else if (statusLower.includes("cancel") || statusLower.includes("void")) {
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Cancelada
            </span>
        );
    }
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status || "N/A"}
        </span>
    );
}

export function InvoicesTab({ 
    companyId, 
    companyName, 
    taxId,
    admCloudRelationshipId,
    admCloudLastSync 
}: InvoicesTabProps) {
    const [invoices, setInvoices] = useState<AdmCloudInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isConfigured, setIsConfigured] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const loadInvoices = async () => {
        setLoading(true);
        setError(null);
        
        const result = await getCompanyInvoices(companyId);
        
        if (result.success && result.invoices) {
            setInvoices(result.invoices);
            setIsConfigured(true);
        } else {
            setError(result.error || "Error al cargar facturas");
            setIsConfigured(result.isConfigured !== false);
        }
        
        setLoading(false);
    };

    useEffect(() => {
        loadInvoices();
    }, [companyId]);

    const handleSync = () => {
        setSyncMessage(null);
        startTransition(async () => {
            const result = await syncCompanyWithAdmCloud(companyId);
            if (result.success) {
                setSyncMessage({ type: 'success', text: `Cliente vinculado: ${result.customer?.Name}` });
                // Recargar facturas después de sincronizar
                await loadInvoices();
            } else {
                setSyncMessage({ type: 'error', text: result.error || 'Error al sincronizar' });
            }
        });
    };

    // Si AdmCloud no está configurado
    if (!isConfigured) {
        return (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="p-4 rounded-full bg-gray-100 mb-4">
                    <CloudOff className="text-gray-400" size={32} />
                </div>
                <h3 className="text-lg font-medium text-dark-slate mb-2">
                    Integración no configurada
                </h3>
                <p className="text-sm text-gray-500 mb-4 max-w-md">
                    Para ver las facturas de este cliente, primero debes configurar la integración 
                    con AdmCloud en la sección de Configuración.
                </p>
                <a 
                    href="/app/settings"
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-nearby-accent hover:text-nearby-dark"
                >
                    Ir a Configuración <ExternalLink size={14} className="ml-1" />
                </a>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header con estado de vinculación */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${admCloudRelationshipId ? 'bg-green-100' : 'bg-yellow-100'}`}>
                        {admCloudRelationshipId ? (
                            <Cloud className="text-green-600" size={20} />
                        ) : (
                            <CloudOff className="text-yellow-600" size={20} />
                        )}
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-dark-slate">
                            {admCloudRelationshipId ? 'Vinculado a AdmCloud' : 'No vinculado'}
                        </h3>
                        {admCloudLastSync && (
                            <p className="text-xs text-gray-500">
                                Última sincronización: {formatDate(admCloudLastSync.toISOString())}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!admCloudRelationshipId && taxId && (
                        <button
                            onClick={handleSync}
                            disabled={isPending}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-nearby-accent border border-nearby-accent rounded-md hover:bg-nearby-accent hover:text-white transition-colors disabled:opacity-50"
                        >
                            {isPending ? (
                                <Loader2 size={14} className="mr-1.5 animate-spin" />
                            ) : (
                                <Link2 size={14} className="mr-1.5" />
                            )}
                            Vincular
                        </button>
                    )}
                    <button
                        onClick={loadInvoices}
                        disabled={loading}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Mensaje de sincronización */}
            {syncMessage && (
                <div className={`flex items-center gap-2 p-3 rounded-md text-sm ${
                    syncMessage.type === 'success' 
                        ? 'bg-green-50 text-green-800' 
                        : 'bg-red-50 text-red-800'
                }`}>
                    {syncMessage.type === 'success' ? (
                        <CheckCircle size={16} />
                    ) : (
                        <AlertCircle size={16} />
                    )}
                    {syncMessage.text}
                </div>
            )}

            {/* Advertencia si no tiene RNC */}
            {!taxId && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                    <AlertCircle size={16} />
                    Esta empresa no tiene RNC configurado. Agrega el RNC para poder vincular con AdmCloud.
                </div>
            )}

            {/* Estado de carga */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin text-nearby-accent" size={32} />
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                    <div className="p-3 rounded-full bg-red-50 mb-3">
                        <AlertCircle className="text-error-red" size={24} />
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{error}</p>
                    {!admCloudRelationshipId && taxId && (
                        <button
                            onClick={handleSync}
                            disabled={isPending}
                            className="text-sm text-nearby-accent hover:underline"
                        >
                            Intentar vincular con el RNC
                        </button>
                    )}
                </div>
            )}

            {/* Lista de facturas */}
            {!loading && !error && invoices.length > 0 && (
                <div className="space-y-3">
                    <p className="text-xs text-gray-500">
                        {invoices.length} factura{invoices.length !== 1 ? 's' : ''} encontrada{invoices.length !== 1 ? 's' : ''}
                    </p>
                    <div className="space-y-2">
                        {invoices.map((invoice) => (
                            <div 
                                key={invoice.ID} 
                                className="bg-white border border-graphite-gray rounded-lg p-4 hover:shadow-sm transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <FileText className="text-gray-400" size={18} />
                                        <span className="font-medium text-dark-slate">
                                            #{invoice.TransactionNumber}
                                        </span>
                                    </div>
                                    {getStatusBadge(invoice.Status)}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                                    <div className="flex items-center gap-1.5 text-gray-600">
                                        <Calendar size={14} className="text-gray-400" />
                                        {formatDate(invoice.TransactionDate)}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-600">
                                        <DollarSign size={14} className="text-gray-400" />
                                        {formatCurrency(invoice.Total, invoice.CurrencyCode)}
                                    </div>
                                    {invoice.DueDate && (
                                        <div className="flex items-center gap-1.5 text-gray-600">
                                            <Hash size={14} className="text-gray-400" />
                                            Vence: {formatDate(invoice.DueDate)}
                                        </div>
                                    )}
                                </div>
                                {invoice.Notes && (
                                    <p className="mt-2 text-xs text-gray-500 truncate">
                                        {invoice.Notes}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Sin facturas */}
            {!loading && !error && invoices.length === 0 && admCloudRelationshipId && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="p-3 rounded-full bg-gray-100 mb-3">
                        <FileText className="text-gray-400" size={24} />
                    </div>
                    <p className="text-sm text-gray-600">
                        No hay facturas registradas para este cliente en AdmCloud
                    </p>
                </div>
            )}
        </div>
    );
}
