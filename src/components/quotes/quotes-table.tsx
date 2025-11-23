"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { QuoteModal } from "./quote-modal";
import { getQuotesByDeal } from "@/actions/quotes";

interface QuotesTableProps {
    dealId: string;
    companyName?: string;
    contactName?: string;
    workspace?: {
        legalName?: string | null;
        rnc?: string | null;
        address?: string | null;
        phone?: string | null;
        logoUrl?: string | null;
    };
}

export function QuotesTable({ dealId, companyName, contactName, workspace }: QuotesTableProps) {
    const [quotes, setQuotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingQuote, setEditingQuote] = useState<any>(null);

    const loadQuotes = async () => {
        setLoading(true);
        console.log('Loading quotes for deal:', dealId);
        const data = await getQuotesByDeal(dealId);
        console.log('Quotes loaded:', data);
        setQuotes(data);
        setLoading(false);
    };

    useEffect(() => {
        loadQuotes();
    }, [dealId]);

    const handleEdit = (quote: any) => {
        setEditingQuote(quote);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        console.log('Closing modal and reloading quotes');
        setShowModal(false);
        setEditingQuote(null);
        loadQuotes();
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; className: string }> = {
            BORRADOR: { label: "Borrador", className: "bg-gray-100 text-gray-800" },
            ACTIVA: { label: "Activa", className: "bg-blue-100 text-blue-800" },
            RECHAZADA: { label: "Rechazada", className: "bg-red-100 text-red-800" },
            APROBADA: { label: "Aprobada", className: "bg-green-100 text-green-800" },
        };
        
        const config = statusConfig[status] || statusConfig.BORRADOR;
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
                {config.label}
            </span>
        );
    };

    const formatCurrency = (value: any, currency: string) => {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        return new Intl.NumberFormat("es-DO", {
            style: "currency",
            currency: currency === "USD" ? "USD" : "DOP",
        }).format(numValue || 0);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">Cargando cotizaciones...</div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-xtartop-black">
                    Cotizaciones ({quotes.length})
                </h3>
                <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-founder-blue hover:bg-ocean-blue transition-colors"
                >
                    <Plus size={16} className="mr-1" />
                    Nueva Cotización
                </button>
            </div>

            {quotes.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500 mb-4">No hay cotizaciones creadas</p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-founder-blue hover:bg-ocean-blue transition-colors"
                    >
                        <Plus size={16} className="mr-2" />
                        Crear Primera Cotización
                    </button>
                </div>
            ) : (
                <div className="border border-graphite-gray rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Nro.
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Fecha
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estado
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Total Pago Único
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Total Mensual
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {quotes.map((quote) => (
                                <tr key={quote.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => handleEdit(quote)}
                                            className="text-sm font-medium text-founder-blue hover:text-ocean-blue hover:underline"
                                        >
                                            #{String(quote.number).padStart(3, "0")}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(quote.date).toLocaleDateString('es-ES', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric'
                                        })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(quote.status)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatCurrency(quote.totalOneTime, quote.currency)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatCurrency(quote.totalMonthly, quote.currency)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Quote Modal */}
            {showModal && (
                <QuoteModal
                    isOpen={showModal}
                    onClose={handleCloseModal}
                    dealId={dealId}
                    companyName={companyName}
                    contactName={contactName}
                    quote={editingQuote}
                    workspace={workspace}
                />
            )}
        </div>
    );
}

