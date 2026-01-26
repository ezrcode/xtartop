"use client";

import { useState } from "react";
import { X, Plus, Trash2, Save, Printer } from "lucide-react";
import { createQuoteAction, updateQuoteAction, QuoteState } from "@/actions/quotes";
import { QuoteStatus, Currency, TaxType, PaymentFrequency } from "@prisma/client";
import { QuotePDFTemplate } from "./quote-pdf-template";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface QuoteItem {
    id?: string;
    name: string;
    price: number;
    quantity: number;
    frequency: PaymentFrequency;
    netPrice: number;
}

interface QuoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    dealId: string;
    companyName?: string;
    contactName?: string;
    quote?: any; // For edit mode
    workspace?: {
        legalName?: string | null;
        rnc?: string | null;
        address?: string | null;
        phone?: string | null;
        logoUrl?: string | null;
    };
}

export function QuoteModal({
    isOpen,
    onClose,
    dealId,
    companyName = "",
    contactName = "",
    quote,
    workspace,
}: QuoteModalProps) {
    const isEditMode = !!quote;
    
    // Convert Decimal values to numbers when loading from database
    const initialItems = quote?.items
        ? quote.items.map((item: any) => ({
            id: item.id,
            name: item.name,
            price: typeof item.price === 'object' ? parseFloat(item.price.toString()) : item.price,
            quantity: typeof item.quantity === 'object' ? parseFloat(item.quantity.toString()) : item.quantity,
            frequency: item.frequency,
            netPrice: typeof item.netPrice === 'object' ? parseFloat(item.netPrice.toString()) : item.netPrice,
        }))
        : [{ name: "", price: 0, quantity: 1, frequency: "PAGO_UNICO" as PaymentFrequency, netPrice: 0 }];
    
    const [items, setItems] = useState<QuoteItem[]>(initialItems);
    
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleAddItem = () => {
        setItems([
            ...items,
            { name: "", price: 0, quantity: 1, frequency: "PAGO_UNICO" as PaymentFrequency, netPrice: 0 },
        ]);
    };

    const handleRemoveItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const handleItemChange = (index: number, field: keyof QuoteItem, value: any) => {
        const newItems = [...items];
        newItems[index] = {
            ...newItems[index],
            [field]: value,
        };
        
        // Recalculate net price - ensure it's always a number
        if (field === "price" || field === "quantity") {
            const priceValue = newItems[index].price;
            const quantityValue = newItems[index].quantity;
            const price = typeof priceValue === 'number' ? priceValue : parseFloat(String(priceValue) || '0');
            const quantity = typeof quantityValue === 'number' ? quantityValue : parseFloat(String(quantityValue) || '1');
            newItems[index].netPrice = price * quantity;
        }
        
        setItems(newItems);
    };

    const calculateTotals = () => {
        let oneTime = 0;
        let monthly = 0;

        items.forEach((item) => {
            const netPriceValue = item.netPrice;
            const netPrice = typeof netPriceValue === 'number' ? netPriceValue : parseFloat(String(netPriceValue) || '0');
            if (item.frequency === "PAGO_UNICO") {
                oneTime += netPrice;
            } else {
                monthly += netPrice;
            }
        });

        return { oneTime, monthly };
    };

    const formatCurrency = (value: number, currency: string) => {
        return new Intl.NumberFormat("es-DO", {
            style: "currency",
            currency: currency === "USD" ? "USD" : "DOP",
        }).format(value);
    };

    const handleSave = async () => {
        console.log('===== QUOTE SUBMIT STARTED =====');
        console.log('Items:', items);
        setError("");
        setSuccess(false);
        
        // Validate items
        const validItems = items.filter(item => item.name.trim() !== "" && item.price > 0);
        console.log('Valid items:', validItems);
        if (validItems.length === 0) {
            setError("Debe agregar al menos un producto con nombre y precio válidos");
            return;
        }

        setIsPending(true);

        // Manually create FormData from inputs
        const formData = new FormData();
        
        // Get values from inputs by ID
        const dateInput = document.getElementById('date') as HTMLInputElement;
        const validityInput = document.getElementById('validity') as HTMLSelectElement;
        const currencyInput = document.getElementById('currency') as HTMLSelectElement;
        const proposalInput = document.getElementById('proposalDescription') as HTMLTextAreaElement;
        const paymentInput = document.getElementById('paymentConditions') as HTMLTextAreaElement;
        const deliveryInput = document.getElementById('deliveryTime') as HTMLInputElement;
        const taxInput = document.getElementById('taxType') as HTMLSelectElement;
        const statusInput = document.getElementById('status') as HTMLSelectElement;
        
        // Append all values
        if (dateInput) formData.append('date', dateInput.value);
        if (validityInput) formData.append('validity', validityInput.value);
        if (currencyInput) formData.append('currency', currencyInput.value);
        if (proposalInput) formData.append('proposalDescription', proposalInput.value);
        if (paymentInput) formData.append('paymentConditions', paymentInput.value);
        if (deliveryInput) formData.append('deliveryTime', deliveryInput.value);
        if (taxInput) formData.append('taxType', taxInput.value);
        if (statusInput) formData.append('status', statusInput.value);
        
        // Only send valid items
        formData.append("items", JSON.stringify(validItems));
        
        console.log('FormData entries:');
        for (let [key, value] of formData.entries()) {
            console.log(key, value);
        }

        try {
            const result = isEditMode
                ? await updateQuoteAction(quote.id, undefined, formData)
                : await createQuoteAction(dealId, undefined, formData);

            console.log('Quote save result:', result);

            // Check if there's an error message or errors object
            if (result.errors || (result.message && !result.message.includes("exitosamente"))) {
                setError(result.message || "Error al guardar la cotización");
            } else {
                // Success case
                console.log('Quote saved successfully, showing success message');
                setSuccess(true);
                setTimeout(() => {
                    console.log('Closing modal after success');
                    onClose();
                }, 1000);
            }
        } catch (err: any) {
            console.error('Quote save error:', err);
            setError(err.message || "Error al guardar la cotización");
        } finally {
            setIsPending(false);
        }
    };

    const generatePDF = async () => {
        const element = document.getElementById('quote-pdf-content');
        if (!element) {
            console.error('PDF template element not found');
            return;
        }

        try {
            // Show a loading indicator
            const originalLeft = element.style.left;
            element.style.left = '0';
            element.style.top = '0';

            // Capture the element as canvas
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            // Hide the element again
            element.style.left = originalLeft;

            // Convert canvas to PDF
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 210; // A4 width in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            
            // Download the PDF
            const fileName = `Cotizacion_${String(quote.number).padStart(3, '0')}_${companyName.replace(/\s+/g, '_')}.pdf`;
            pdf.save(fileName);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error al generar el PDF');
        }
    };

    const totals = calculateTotals();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-end sm:items-start justify-center p-0 sm:p-4 sm:pt-10">
                {/* Overlay */}
                <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

                {/* Modal */}
                <div className="relative bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto safe-bottom">
                    {/* Header */}
                    <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 safe-top">
                        <h2 className="text-base sm:text-xl font-semibold text-nearby-dark">
                            {isEditMode ? `Editar Cotización #${String(quote.number).padStart(3, "0")}` : "Nueva Cotización"}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Form */}
                    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                        {error && (
                            <div className="p-4 rounded-md bg-red-50 text-red-800 text-sm">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="p-4 rounded-md bg-green-50 text-green-800 text-sm">
                                ¡Cotización guardada exitosamente!
                            </div>
                        )}

                        {/* Company & Contact (Read-only) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-dark-slate mb-1.5">
                                    Empresa
                                </label>
                                <input
                                    type="text"
                                    value={companyName}
                                    readOnly
                                    className="w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg bg-gray-50 text-gray-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-dark-slate mb-1.5">
                                    Contacto
                                </label>
                                <input
                                    type="text"
                                    value={contactName}
                                    readOnly
                                    className="w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg bg-gray-50 text-gray-600"
                                />
                            </div>
                        </div>

                        {/* Date, Validity, Currency */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label htmlFor="date" className="block text-sm font-medium text-dark-slate mb-1.5">
                                    Fecha *
                                </label>
                                <input
                                    type="date"
                                    name="date"
                                    id="date"
                                    defaultValue={quote?.date ? new Date(quote.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                                    required
                                    className="w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                                />
                            </div>
                            <div>
                                <label htmlFor="validity" className="block text-sm font-medium text-dark-slate mb-1.5">
                                    Validez *
                                </label>
                                <select
                                    name="validity"
                                    id="validity"
                                    defaultValue={quote?.validity || "30 días"}
                                    required
                                    className="w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors bg-white"
                                >
                                    <option value="10 días">10 días</option>
                                    <option value="20 días">20 días</option>
                                    <option value="30 días">30 días</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="currency" className="block text-sm font-medium text-dark-slate mb-1.5">
                                    Moneda *
                                </label>
                                <select
                                    name="currency"
                                    id="currency"
                                    defaultValue={quote?.currency || "USD"}
                                    required
                                    className="w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors bg-white"
                                >
                                    <option value="USD">USD</option>
                                    <option value="DOP">DOP</option>
                                </select>
                            </div>
                        </div>

                        {/* Products Table */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-dark-slate">
                                    Productos *
                                </label>
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="inline-flex items-center px-2 py-1 text-xs sm:text-sm text-nearby-accent hover:bg-blue-50 rounded transition-colors"
                                >
                                    <Plus size={16} className="mr-1" />
                                    <span className="hidden sm:inline">Agregar Producto</span>
                                    <span className="sm:hidden">Agregar</span>
                                </button>
                            </div>
                            
                            <div className="border border-graphite-gray rounded-md overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                            <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
                                            <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cant.</th>
                                            <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Frec.</th>
                                            <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Neto</th>
                                            <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {items.map((item, index) => (
                                            <tr key={index}>
                                                <td className="px-2 sm:px-3 py-2">
                                                    <input
                                                        type="text"
                                                        value={item.name}
                                                        onChange={(e) => handleItemChange(index, "name", e.target.value)}
                                                        placeholder="Nombre"
                                                        required
                                                        className="w-full min-w-[120px] px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm"
                                                    />
                                                </td>
                                                <td className="px-2 sm:px-3 py-2">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={item.price}
                                                        onChange={(e) => handleItemChange(index, "price", parseFloat(e.target.value) || 0)}
                                                        required
                                                        className="w-full min-w-[80px] px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm"
                                                    />
                                                </td>
                                                <td className="px-2 sm:px-3 py-2">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={item.quantity}
                                                        onChange={(e) => handleItemChange(index, "quantity", parseFloat(e.target.value) || 1)}
                                                        required
                                                        className="w-full min-w-[60px] px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm"
                                                    />
                                                </td>
                                                <td className="px-2 sm:px-3 py-2">
                                                    <select
                                                        value={item.frequency}
                                                        onChange={(e) => handleItemChange(index, "frequency", e.target.value as PaymentFrequency)}
                                                        className="w-full min-w-[100px] px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm"
                                                    >
                                                        <option value="PAGO_UNICO">Único</option>
                                                        <option value="MENSUAL">Mensual</option>
                                                    </select>
                                                </td>
                                                <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium whitespace-nowrap">
                                                    {(typeof item.netPrice === 'number' ? item.netPrice : parseFloat(String(item.netPrice) || '0')).toFixed(2)}
                                                </td>
                                                <td className="px-2 sm:px-3 py-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(index)}
                                                        disabled={items.length === 1}
                                                        className="text-error-red hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        <Trash2 size={14} className="sm:w-4 sm:h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Totals */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-md">
                            <div>
                                <label className="block text-sm font-medium text-dark-slate mb-1">
                                    Total Pago Único
                                </label>
                                <div className="text-lg font-bold text-nearby-dark">
                                    {formatCurrency(totals.oneTime, "USD")}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-dark-slate mb-1">
                                    Total Mensual
                                </label>
                                <div className="text-lg font-bold text-nearby-dark">
                                    {formatCurrency(totals.monthly, "USD")}
                                </div>
                            </div>
                        </div>

                        {/* Proposal Description */}
                        <div>
                            <label htmlFor="proposalDescription" className="block text-sm font-medium text-dark-slate mb-1.5">
                                Descripción de la Propuesta
                            </label>
                            <textarea
                                name="proposalDescription"
                                id="proposalDescription"
                                rows={6}
                                defaultValue={quote?.proposalDescription || ""}
                                placeholder="Describa los detalles de la propuesta..."
                                className="w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                            />
                        </div>

                        {/* Payment Conditions, Delivery Time */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="paymentConditions" className="block text-sm font-medium text-dark-slate mb-1.5">
                                    Condiciones de Pago
                                </label>
                                <textarea
                                    name="paymentConditions"
                                    id="paymentConditions"
                                    rows={2}
                                    defaultValue={quote?.paymentConditions || ""}
                                    placeholder="Ej: 50% adelanto, 50% contra entrega"
                                    className="w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                                />
                            </div>
                            <div>
                                <label htmlFor="deliveryTime" className="block text-sm font-medium text-dark-slate mb-1.5">
                                    Tiempo de Entrega
                                </label>
                                <input
                                    type="text"
                                    name="deliveryTime"
                                    id="deliveryTime"
                                    defaultValue={quote?.deliveryTime || ""}
                                    placeholder="Ej: 15 días hábiles"
                                    className="w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors"
                                />
                            </div>
                        </div>

                        {/* Tax Type & Status */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="taxType" className="block text-sm font-medium text-dark-slate mb-1.5">
                                    Impuestos *
                                </label>
                                <select
                                    name="taxType"
                                    id="taxType"
                                    defaultValue={quote?.taxType || "INCLUIDOS"}
                                    required
                                    className="w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors bg-white"
                                >
                                    <option value="INCLUIDOS">Incluidos</option>
                                    <option value="NO_INCLUIDOS">No incluidos</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="status" className="block text-sm font-medium text-dark-slate mb-1.5">
                                    Estado *
                                </label>
                                <select
                                    name="status"
                                    id="status"
                                    defaultValue={quote?.status || "BORRADOR"}
                                    required
                                    className="w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-graphite-gray rounded-lg focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors bg-white"
                                >
                                    <option value="BORRADOR">Borrador</option>
                                    <option value="ACTIVA">Activa</option>
                                    <option value="RECHAZADA">Rechazada</option>
                                    <option value="APROBADA">Aprobada</option>
                                </select>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-gray-200">
                            <div>
                                {isEditMode && (
                                    <button
                                        type="button"
                                        onClick={generatePDF}
                                        className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3 sm:py-2 border border-graphite-gray rounded-lg shadow-sm text-sm font-medium text-dark-slate bg-white hover:bg-gray-50 transition-colors"
                                    >
                                        <Printer size={16} className="mr-2" />
                                        Imprimir PDF
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-col-reverse sm:flex-row items-center gap-2 sm:gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="w-full sm:w-auto px-4 py-3 sm:py-2 border border-graphite-gray rounded-lg shadow-sm text-sm font-medium text-dark-slate bg-white hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={isPending}
                                    className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3 sm:py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-nearby-accent hover:bg-nearby-dark transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isPending ? (
                                        <>Guardando...</>
                                    ) : (
                                        <>
                                            <Save size={16} className="mr-2" />
                                            Guardar
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden PDF Template for rendering */}
            {isEditMode && quote && (
                <QuotePDFTemplate
                    quote={quote}
                    items={items}
                    companyName={companyName}
                    contactName={contactName}
                    totals={totals}
                    workspace={workspace}
                />
            )}
        </div>
    );
}

