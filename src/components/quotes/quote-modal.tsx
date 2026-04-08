"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, ImagePlus, Italic, List, Plus, Printer, Save, Trash2, X } from "lucide-react";
import { createQuoteAction, deleteQuote, updateQuoteAction, QuoteState } from "@/actions/quotes";
import { QuoteStatus, Currency, TaxType, PaymentFrequency } from "@prisma/client";
import { QuotePDFFormat, QuotePDFTemplate } from "./quote-pdf-template";
import { formatNumber } from "@/lib/format";
import { calculateQuoteTaxBreakdown } from "@/lib/quote-taxes";
import { formatQuoteNumber } from "@/lib/deal-number";
import { normalizeQuoteRichText, sanitizeQuoteRichText } from "@/lib/rich-text";
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
    projectRateReferences?: Array<{
        id: string;
        name: string;
        category?: string | null;
        description?: string | null;
        unit: "POR_HORA" | "POR_PROYECTO" | "PAQUETE";
        hourlyRate?: unknown;
        referenceHours?: number | null;
        fixedPrice?: unknown;
        notes?: string | null;
        isActive: boolean;
    }>;
    taxes?: Array<{
        id: string;
        name: string;
        rate: unknown;
        isActive: boolean;
    }>;
}

interface RichTextEditorProps {
    id: string;
    value: string;
    onChange: (value: string) => void;
}

function QuoteRichTextEditor({ id, value, onChange }: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const savedRangeRef = useRef<Range | null>(null);
    const selectedImageRef = useRef<HTMLImageElement | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        if (editor.innerHTML !== value) {
            editor.innerHTML = value || "";
        }
    }, [value]);

    const syncValue = () => {
        onChange(sanitizeQuoteRichText(editorRef.current?.innerHTML || ""));
    };

    const rememberSelection = () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        if (editorRef.current?.contains(range.commonAncestorContainer)) {
            savedRangeRef.current = range.cloneRange();
        }
    };

    const restoreSelection = () => {
        const range = savedRangeRef.current;
        if (!range) return;

        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
    };

    const focusEditor = () => {
        editorRef.current?.focus();
        restoreSelection();
    };

    const applyCommand = (command: string, value?: string) => {
        focusEditor();
        document.execCommand(command, false, value);
        syncValue();
    };

    const applyTextOrImageAlignment = (alignment: "left" | "center" | "right" | "justify") => {
        const selectedImage = selectedImageRef.current;

        if (selectedImage && editorRef.current?.contains(selectedImage)) {
            selectedImage.style.display = "block";
            selectedImage.style.maxWidth = "100%";
            selectedImage.style.height = "auto";
            selectedImage.style.marginLeft = alignment === "right" || alignment === "center" ? "auto" : "0";
            selectedImage.style.marginRight = alignment === "left" || alignment === "center" ? "auto" : "0";
            if (alignment === "justify") {
                selectedImage.style.marginLeft = "auto";
                selectedImage.style.marginRight = "auto";
            }
            syncValue();
            return;
        }

        const command = alignment === "justify" ? "justifyFull" : `justify${alignment[0].toUpperCase()}${alignment.slice(1)}`;
        applyCommand(command);
    };

    const insertImage = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", "logo");
        formData.append("folder", "quote-proposals");

        const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
        });
        const data = await response.json();

        if (!response.ok || !data.url) {
            throw new Error(data.error || "No fue posible subir la imagen");
        }

        const imageHtml = `<img src="${data.url}" alt="Imagen de propuesta" style="max-width: 100%; width: 360px; height: auto; display: block; margin-left: auto; margin-right: auto;" />`;
        applyCommand("insertHTML", imageHtml);
    };

    const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setUploadingImage(true);
            await insertImage(file);
        } catch (error) {
            alert(error instanceof Error ? error.message : "No fue posible insertar la imagen");
        } finally {
            setUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const toolbarButtonClass = "inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--muted-text)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50";

    return (
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden">
            <div className="flex flex-wrap items-center gap-1 border-b border-[var(--card-border)] bg-[var(--surface-2)] px-2 py-2">
                <button type="button" className={toolbarButtonClass} onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand("bold")} aria-label="Negrita">
                    <Bold size={16} />
                </button>
                <button type="button" className={toolbarButtonClass} onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand("italic")} aria-label="Cursiva">
                    <Italic size={16} />
                </button>
                <button type="button" className={toolbarButtonClass} onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand("insertUnorderedList")} aria-label="Viñetas">
                    <List size={16} />
                </button>
                <div className="mx-1 h-6 w-px bg-[var(--card-border)]" />
                <button type="button" className={toolbarButtonClass} onMouseDown={(event) => event.preventDefault()} onClick={() => applyTextOrImageAlignment("left")} aria-label="Alinear a la izquierda">
                    <AlignLeft size={16} />
                </button>
                <button type="button" className={toolbarButtonClass} onMouseDown={(event) => event.preventDefault()} onClick={() => applyTextOrImageAlignment("center")} aria-label="Centrar">
                    <AlignCenter size={16} />
                </button>
                <button type="button" className={toolbarButtonClass} onMouseDown={(event) => event.preventDefault()} onClick={() => applyTextOrImageAlignment("right")} aria-label="Alinear a la derecha">
                    <AlignRight size={16} />
                </button>
                <button type="button" className={toolbarButtonClass} onMouseDown={(event) => event.preventDefault()} onClick={() => applyTextOrImageAlignment("justify")} aria-label="Justificar">
                    <AlignJustify size={16} />
                </button>
                <div className="mx-1 h-6 w-px bg-[var(--card-border)]" />
                <button
                    type="button"
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 text-xs font-medium text-[var(--muted-text)] transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
                    onMouseDown={(event) => {
                        event.preventDefault();
                        rememberSelection();
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                >
                    <ImagePlus size={16} />
                    {uploadingImage ? "Subiendo..." : "Imagen"}
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={handleImageChange}
                />
            </div>
            <div
                id={id}
                ref={editorRef}
                contentEditable
                role="textbox"
                aria-multiline="true"
                aria-label="Descripción de la propuesta"
                suppressContentEditableWarning
                onInput={syncValue}
                onKeyUp={rememberSelection}
                onMouseUp={rememberSelection}
                onBlur={rememberSelection}
                onClick={(event) => {
                    const target = event.target;
                    selectedImageRef.current = target instanceof HTMLImageElement ? target : null;
                    rememberSelection();
                }}
                className="quote-rich-editor min-h-[180px] w-full px-3 py-3 text-base sm:text-sm leading-relaxed text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-nearby-dark/15"
            />
            <p className="border-t border-[var(--card-border)] px-3 py-2 text-xs text-[var(--muted-text)]">
                Tip: selecciona una imagen y usa los botones de alineación para ubicarla en el PDF.
            </p>
        </div>
    );
}

export function QuoteModal({
    isOpen,
    onClose,
    dealId,
    companyName = "",
    contactName = "",
    quote,
    workspace,
    projectRateReferences = [],
    taxes = [],
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
    const [selectedCurrency, setSelectedCurrency] = useState<Currency>(quote?.currency || "USD");
    const [selectedTaxType, setSelectedTaxType] = useState<TaxType>(quote?.taxType || "INCLUIDOS");
    const [selectedTaxId, setSelectedTaxId] = useState<string>(quote?.taxId || "");
    const [isPending, setIsPending] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [hasSavedNewQuote, setHasSavedNewQuote] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [proposalDescription, setProposalDescription] = useState(() => normalizeQuoteRichText(quote?.proposalDescription || ""));
    const [pdfFormat, setPdfFormat] = useState<QuotePDFFormat>("basic");
    const quoteCode = isEditMode ? formatQuoteNumber(quote?.deal?.number, quote?.number) : null;

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        setProposalDescription(normalizeQuoteRichText(quote?.proposalDescription || ""));
        setHasSavedNewQuote(false);
        setSuccess(false);
        setError("");
    }, [quote?.id, isOpen]);

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

    const handleDelete = async () => {
        if (!quote?.id) return;

        const quoteNumber = quoteCode || `#${String(quote.number).padStart(3, "0")}`;
        const confirmed = window.confirm(`¿Eliminar la cotización ${quoteNumber}? Esta acción no se puede deshacer.`);
        if (!confirmed) return;

        setError("");
        setSuccess(false);
        setIsDeleting(true);

        try {
            const result = await deleteQuote(quote.id);

            if (result.message && !result.message.includes("exitosamente")) {
                setError(result.message || "Error al eliminar la cotización");
                return;
            }

            onClose();
        } catch (err: any) {
            console.error("Quote delete error:", err);
            setError(err.message || "Error al eliminar la cotización");
        } finally {
            setIsDeleting(false);
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

    const formatUSD = (value: unknown) => {
        const n = Number(value);
        if (!Number.isFinite(n) || n <= 0) return "-";
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(n);
    };

    const formatRate = (value: unknown) => {
        const n = Number(value);
        if (!Number.isFinite(n) || n <= 0) return "-";
        return `${n.toLocaleString("es-DO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
    };

    const selectedTax = useMemo(() => {
        const tax = taxes.find((item) => item.id === selectedTaxId);
        if (tax) return tax;

        if (quote?.taxType === "INCLUIDOS" && Number(quote?.taxRate || 0) > 0) {
            return {
                id: quote?.taxId || "",
                name: quote?.taxName || "Impuesto",
                rate: quote?.taxRate,
                isActive: false,
            };
        }

        return null;
    }, [quote, selectedTaxId, taxes]);

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

        if (!isEditMode && hasSavedNewQuote) {
            setError("Esta cotización ya fue creada. Cierra el modal para verla en el listado antes de crear otra.");
            return;
        }

        setIsPending(true);

        // Manually create FormData from inputs
        const formData = new FormData();
        
        // Get values from inputs by ID
        const dateInput = document.getElementById('quote-date') as HTMLInputElement;
        const validityInput = document.getElementById('quote-validity') as HTMLSelectElement;
        const currencyInput = document.getElementById('quote-currency') as HTMLSelectElement;
        const paymentInput = document.getElementById('quote-paymentConditions') as HTMLTextAreaElement;
        const deliveryInput = document.getElementById('quote-deliveryTime') as HTMLInputElement;
        const taxInput = document.getElementById('quote-taxType') as HTMLSelectElement;
        const taxSelectorInput = document.getElementById('quote-taxId') as HTMLSelectElement;
        const statusInput = document.getElementById('quote-status') as HTMLSelectElement;
        
        // Append all values
        if (dateInput) formData.append('date', dateInput.value);
        if (validityInput) formData.append('validity', validityInput.value);
        if (currencyInput) formData.append('currency', currencyInput.value);
        formData.append('proposalDescription', sanitizeQuoteRichText(proposalDescription));
        if (paymentInput) formData.append('paymentConditions', paymentInput.value);
        if (deliveryInput) formData.append('deliveryTime', deliveryInput.value);
        if (taxInput) formData.append('taxType', taxInput.value);
        if (taxSelectorInput && taxInput?.value === "INCLUIDOS") formData.append('taxId', taxSelectorInput.value);
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
                if (!isEditMode) setHasSavedNewQuote(true);
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
            const formatLabel = pdfFormat === "advanced" ? "Avanzado" : "Basico";
            const fileName = `Cotizacion_${formatLabel}_${(quoteCode || String(quote.number).padStart(3, '0')).replace(/[^a-zA-Z0-9-]/g, "_")}_${companyName.replace(/\s+/g, '_')}.pdf`;
            pdf.save(fileName);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error al generar el PDF');
        }
    };

    const totals = calculateTotals();
    const taxBreakdown = calculateQuoteTaxBreakdown({
        totalOneTime: totals.oneTime,
        totalMonthly: totals.monthly,
        taxRate: selectedTaxType === "INCLUIDOS" ? Number(selectedTax?.rate || 0) : null,
    });
    const showTaxSelector = selectedTaxType === "INCLUIDOS";
    const showTaxBreakdown = showTaxSelector && Number(selectedTax?.rate || 0) > 0;
    const taxSummaryLabel = selectedTax ? `${selectedTax.name} (${formatRate(selectedTax.rate)})` : "Seleccione un impuesto";

    if (!isOpen || !mounted) return null;

    const modal = (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-end sm:items-start justify-center p-0 sm:p-4 sm:pt-10">
                {/* Overlay */}
                <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

                {/* Modal */}
                <div className="relative bg-[var(--card-bg)] rounded-t-lg sm:rounded-lg shadow-xl w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden safe-bottom">
                    {/* Header */}
                    <div className="sticky top-0 bg-[var(--card-bg)] z-10 flex items-center justify-between p-4 sm:p-6 border-b border-[var(--card-border)] safe-top">
                        <h2 className="text-base sm:text-xl font-semibold text-[var(--foreground)]">
                            {isEditMode ? `Editar Cotización ${quoteCode}` : "Nueva Cotización"}
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 text-[var(--muted-text)] hover:text-[var(--foreground)] hover:bg-[var(--hover-bg)] rounded-full transition-colors"
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
                                ¡Cotización guardada exitosamente! Puedes cerrar el modal cuando termines.
                            </div>
                        )}

                        {/* Company & Contact (Read-only) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                                    Empresa
                                </label>
                                <input
                                    type="text"
                                    value={companyName}
                                    readOnly
                                    className="w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-[var(--card-border)] rounded-lg bg-[var(--surface-2)] text-[var(--muted-text)]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                                    Contacto
                                </label>
                                <input
                                    type="text"
                                    value={contactName}
                                    readOnly
                                    className="w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-[var(--card-border)] rounded-lg bg-[var(--surface-2)] text-[var(--muted-text)]"
                                />
                            </div>
                        </div>

                        {/* Date, Validity, Currency */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="min-w-0">
                                <label htmlFor="quote-date" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                                    Fecha *
                                </label>
                                <input
                                    type="date"
                                    id="quote-date"
                                    defaultValue={quote?.date ? new Date(quote.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                                    required
                                    className="w-full min-w-0 max-w-full appearance-none px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-[var(--card-border)] rounded-lg focus:ring-2 focus:ring-nearby-dark/15 focus:border-nearby-dark/50 transition-colors"
                                />
                            </div>
                            <div className="min-w-0">
                                <label htmlFor="quote-validity" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                                    Validez *
                                </label>
                                <select
                                    id="quote-validity"
                                    defaultValue={quote?.validity || "30 días"}
                                    required
                                    className="w-full min-w-0 max-w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-[var(--card-border)] rounded-lg focus:ring-2 focus:ring-nearby-dark/15 focus:border-nearby-dark/50 transition-colors bg-[var(--card-bg)]"
                                >
                                    <option value="10 días">10 días</option>
                                    <option value="20 días">20 días</option>
                                    <option value="30 días">30 días</option>
                                </select>
                            </div>
                            <div className="min-w-0">
                                <label htmlFor="quote-currency" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                                    Moneda *
                                </label>
                                <select
                                    id="quote-currency"
                                    value={selectedCurrency}
                                    onChange={(e) => setSelectedCurrency(e.target.value as Currency)}
                                    required
                                    className="w-full min-w-0 max-w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-[var(--card-border)] rounded-lg focus:ring-2 focus:ring-nearby-dark/15 focus:border-nearby-dark/50 transition-colors bg-[var(--card-bg)]"
                                >
                                    <option value="USD">USD</option>
                                    <option value="DOP">DOP</option>
                                </select>
                            </div>
                        </div>

                        {/* Products */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-[var(--foreground)]">
                                    Productos *
                                </label>
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="inline-flex items-center px-2 py-1 text-xs sm:text-sm text-[var(--foreground)] font-medium hover:bg-[var(--hover-bg)] rounded transition-colors"
                                >
                                    <Plus size={16} className="mr-1" />
                                    <span className="hidden sm:inline">Agregar Producto</span>
                                    <span className="sm:hidden">Agregar</span>
                                </button>
                            </div>

                            {/* Mobile cards */}
                            <div className="sm:hidden space-y-3">
                                {items.map((item, index) => (
                                    <div
                                        key={index}
                                        className="border border-[var(--card-border)] rounded-lg bg-[var(--surface-2)] p-3 space-y-3 w-full min-w-0 overflow-hidden"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-text)]">
                                                Producto {index + 1}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(index)}
                                                disabled={items.length === 1}
                                                className="text-error-red hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed p-1"
                                                aria-label={`Eliminar producto ${index + 1}`}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        <div className="min-w-0">
                                            <label className="block text-xs font-medium text-[var(--muted-text)] mb-1">
                                                Nombre
                                            </label>
                                            <input
                                                type="text"
                                                value={item.name}
                                                onChange={(e) => handleItemChange(index, "name", e.target.value)}
                                                placeholder="Nombre"
                                                required
                                                className="w-full min-w-0 max-w-full px-3 py-3 text-base border border-[var(--card-border)] rounded-lg bg-[var(--card-bg)]"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="min-w-0">
                                                <label className="block text-xs font-medium text-[var(--muted-text)] mb-1">
                                                    Precio
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={item.price}
                                                    onChange={(e) => handleItemChange(index, "price", parseFloat(e.target.value) || 0)}
                                                    required
                                                    className="w-full min-w-0 max-w-full px-3 py-3 text-base border border-[var(--card-border)] rounded-lg bg-[var(--card-bg)]"
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <label className="block text-xs font-medium text-[var(--muted-text)] mb-1">
                                                    Cantidad
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(index, "quantity", parseFloat(e.target.value) || 1)}
                                                    required
                                                    className="w-full min-w-0 max-w-full px-3 py-3 text-base border border-[var(--card-border)] rounded-lg bg-[var(--card-bg)]"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="min-w-0">
                                                <label className="block text-xs font-medium text-[var(--muted-text)] mb-1">
                                                    Frecuencia
                                                </label>
                                                <select
                                                    value={item.frequency}
                                                    onChange={(e) => handleItemChange(index, "frequency", e.target.value as PaymentFrequency)}
                                                    className="w-full min-w-0 max-w-full px-3 py-3 text-base border border-[var(--card-border)] rounded-lg bg-[var(--card-bg)]"
                                                >
                                                    <option value="PAGO_UNICO">Único</option>
                                                    <option value="MENSUAL">Mensual</option>
                                                </select>
                                            </div>
                                            <div className="min-w-0">
                                                <label className="block text-xs font-medium text-[var(--muted-text)] mb-1">
                                                    Neto
                                                </label>
                                                <div className="w-full min-w-0 max-w-full px-3 py-3 text-base font-semibold border border-[var(--card-border)] rounded-lg bg-[var(--card-bg)] text-[var(--foreground)] truncate">
                                                    {formatNumber(typeof item.netPrice === 'number' ? item.netPrice : parseFloat(String(item.netPrice) || '0'), 2)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop table */}
                            <div className="hidden sm:block border border-[var(--card-border)] rounded-md overflow-x-auto overscroll-x-contain">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-[var(--surface-2)]">
                                        <tr>
                                            <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-[var(--muted-text)] uppercase">Nombre</th>
                                            <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-[var(--muted-text)] uppercase">Precio</th>
                                            <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-[var(--muted-text)] uppercase">Cant.</th>
                                            <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-[var(--muted-text)] uppercase">Frec.</th>
                                            <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-[var(--muted-text)] uppercase">Neto</th>
                                            <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-[var(--muted-text)] uppercase w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-[var(--card-bg)] divide-y divide-gray-200">
                                        {items.map((item, index) => (
                                            <tr key={index}>
                                                <td className="px-2 sm:px-3 py-2">
                                                    <input
                                                        type="text"
                                                        value={item.name}
                                                        onChange={(e) => handleItemChange(index, "name", e.target.value)}
                                                        placeholder="Nombre"
                                                        required
                                                        className="w-full min-w-[120px] px-2 py-1 border border-[var(--card-border)] rounded text-xs sm:text-sm"
                                                    />
                                                </td>
                                                <td className="px-2 sm:px-3 py-2">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={item.price}
                                                        onChange={(e) => handleItemChange(index, "price", parseFloat(e.target.value) || 0)}
                                                        required
                                                        className="w-full min-w-[80px] px-2 py-1 border border-[var(--card-border)] rounded text-xs sm:text-sm"
                                                    />
                                                </td>
                                                <td className="px-2 sm:px-3 py-2">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={item.quantity}
                                                        onChange={(e) => handleItemChange(index, "quantity", parseFloat(e.target.value) || 1)}
                                                        required
                                                        className="w-full min-w-[60px] px-2 py-1 border border-[var(--card-border)] rounded text-xs sm:text-sm"
                                                    />
                                                </td>
                                                <td className="px-2 sm:px-3 py-2">
                                                    <select
                                                        value={item.frequency}
                                                        onChange={(e) => handleItemChange(index, "frequency", e.target.value as PaymentFrequency)}
                                                        className="w-full min-w-[100px] px-2 py-1 border border-[var(--card-border)] rounded text-xs sm:text-sm"
                                                    >
                                                        <option value="PAGO_UNICO">Único</option>
                                                        <option value="MENSUAL">Mensual</option>
                                                    </select>
                                                </td>
                                                <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium whitespace-nowrap">
                                                    {formatNumber(typeof item.netPrice === 'number' ? item.netPrice : parseFloat(String(item.netPrice) || '0'), 2)}
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

                        {/* Taxes */}
                        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-2)] p-4 sm:p-5 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                <div>
                                    <p className="text-sm font-semibold text-[var(--foreground)]">Impuestos</p>
                                    <p className="text-xs text-[var(--muted-text)] mt-1">
                                        Define si esta cotización lleva impuestos y cuál se debe agregar sobre la base imponible.
                                    </p>
                                </div>
                                {showTaxBreakdown && (
                                    <div className="inline-flex items-center rounded-full border border-nearby-dark/30 bg-nearby-dark/8 dark:bg-nearby-dark-300/10 px-3 py-1 text-xs font-medium text-nearby-dark dark:text-nearby-dark-300">
                                        {taxSummaryLabel}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="quote-taxType" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                                        Impuestos *
                                    </label>
                                    <select
                                        id="quote-taxType"
                                        value={selectedTaxType}
                                        onChange={(e) => {
                                            const nextTaxType = e.target.value as TaxType;
                                            setSelectedTaxType(nextTaxType);
                                            if (nextTaxType !== "INCLUIDOS") {
                                                setSelectedTaxId("");
                                            }
                                        }}
                                        required
                                        className="w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-[var(--card-border)] rounded-lg focus:ring-2 focus:ring-nearby-dark/15 focus:border-nearby-dark/50 transition-colors bg-[var(--card-bg)]"
                                    >
                                        <option value="INCLUIDOS">Aplicar impuesto</option>
                                        <option value="NO_INCLUIDOS">Sin impuesto</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="quote-taxId" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                                        Impuesto disponible
                                    </label>
                                    <select
                                        id="quote-taxId"
                                        value={selectedTaxId}
                                        onChange={(e) => setSelectedTaxId(e.target.value)}
                                        disabled={!showTaxSelector}
                                        className="w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-[var(--card-border)] rounded-lg focus:ring-2 focus:ring-nearby-dark/15 focus:border-nearby-dark/50 transition-colors bg-[var(--card-bg)] disabled:opacity-60"
                                    >
                                        <option value="">
                                            {showTaxSelector ? "Seleccione un impuesto" : "Disponible cuando el impuesto esté activo"}
                                        </option>
                                        {selectedTax && !taxes.some((tax) => tax.id === selectedTax.id) && selectedTax.id && (
                                            <option value={selectedTax.id}>
                                                {selectedTax.name} ({formatRate(selectedTax.rate)}) [archivado]
                                            </option>
                                        )}
                                        {taxes.map((tax) => (
                                            <option key={tax.id} value={tax.id}>
                                                {tax.name} ({formatRate(tax.rate)})
                                            </option>
                                        ))}
                                    </select>
                                    {showTaxSelector && taxes.length === 0 && (
                                        <p className="mt-1 text-xs text-[var(--muted-text)]">
                                            Primero debes crear impuestos en Configuración &gt; Impuestos.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Totals */}
                        <div className="bg-[var(--surface-2)] p-4 rounded-md space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-[var(--foreground)]">Resumen de productos</p>
                                    <p className="text-xs text-[var(--muted-text)]">
                                        {showTaxBreakdown
                                            ? `A la base imponible se le agregará: ${taxSummaryLabel}`
                                            : "Totales calculados según los productos cargados"}
                                    </p>
                                </div>
                                {showTaxSelector && (
                                    <div className="sm:text-right">
                                        <p className="text-xs uppercase tracking-wide text-[var(--muted-text)]">Impuesto seleccionado</p>
                                        <p className="text-sm font-medium text-[var(--foreground)]">{taxSummaryLabel}</p>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                                    <label className="block text-xs uppercase tracking-wide text-[var(--muted-text)] mb-3">
                                        Pago único
                                    </label>
                                    {showTaxBreakdown ? (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-[var(--muted-text)]">Base imponible</span>
                                                <span className="font-medium text-[var(--foreground)]">{formatCurrency(taxBreakdown.baseOneTime, selectedCurrency)}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-[var(--muted-text)]">{selectedTax?.name || "Impuesto"}</span>
                                                <span className="font-medium text-[var(--foreground)]">{formatCurrency(taxBreakdown.taxOneTime, selectedCurrency)}</span>
                                            </div>
                                            <div className="flex items-center justify-between pt-2 border-t border-[var(--card-border)]">
                                                <span className="text-sm font-semibold text-[var(--foreground)]">Total pago único con impuesto</span>
                                                <span className="text-lg font-bold text-[var(--foreground)]">{formatCurrency(taxBreakdown.totalOneTime, selectedCurrency)}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-[var(--muted-text)]">Base imponible</span>
                                                <span className="font-medium text-[var(--foreground)]">{formatCurrency(totals.oneTime, selectedCurrency)}</span>
                                            </div>
                                            <div className="flex items-center justify-between pt-2 border-t border-[var(--card-border)]">
                                                <span className="text-sm font-semibold text-[var(--foreground)]">Total pago único</span>
                                                <span className="text-lg font-bold text-[var(--foreground)]">{formatCurrency(totals.oneTime, selectedCurrency)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                                    <label className="block text-xs uppercase tracking-wide text-[var(--muted-text)] mb-3">
                                        Mensual
                                    </label>
                                    {showTaxBreakdown ? (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-[var(--muted-text)]">Base imponible</span>
                                                <span className="font-medium text-[var(--foreground)]">{formatCurrency(taxBreakdown.baseMonthly, selectedCurrency)}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-[var(--muted-text)]">{selectedTax?.name || "Impuesto"}</span>
                                                <span className="font-medium text-[var(--foreground)]">{formatCurrency(taxBreakdown.taxMonthly, selectedCurrency)}</span>
                                            </div>
                                            <div className="flex items-center justify-between pt-2 border-t border-[var(--card-border)]">
                                                <span className="text-sm font-semibold text-[var(--foreground)]">Total mensual con impuesto</span>
                                                <span className="text-lg font-bold text-[var(--foreground)]">{formatCurrency(taxBreakdown.totalMonthly, selectedCurrency)}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-[var(--muted-text)]">Base imponible</span>
                                                <span className="font-medium text-[var(--foreground)]">{formatCurrency(totals.monthly, selectedCurrency)}</span>
                                            </div>
                                            <div className="flex items-center justify-between pt-2 border-t border-[var(--card-border)]">
                                                <span className="text-sm font-semibold text-[var(--foreground)]">Total mensual</span>
                                                <span className="text-lg font-bold text-[var(--foreground)]">{formatCurrency(totals.monthly, selectedCurrency)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Proposal Description */}
                        <div>
                            <label htmlFor="quote-proposalDescription" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                                Descripción de la Propuesta
                            </label>
                            <QuoteRichTextEditor
                                id="quote-proposalDescription"
                                value={proposalDescription}
                                onChange={setProposalDescription}
                            />
                        </div>

                        {/* Payment Conditions, Delivery Time */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="quote-paymentConditions" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                                    Condiciones de Pago
                                </label>
                                <textarea
                                    id="quote-paymentConditions"
                                    rows={2}
                                    defaultValue={quote?.paymentConditions || ""}
                                    placeholder="Ej: 50% adelanto, 50% contra entrega"
                                    className="w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-[var(--card-border)] rounded-lg focus:ring-2 focus:ring-nearby-dark/15 focus:border-nearby-dark/50 transition-colors"
                                />
                            </div>
                            <div>
                                <label htmlFor="quote-deliveryTime" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                                    Tiempo de Entrega
                                </label>
                                <input
                                    type="text"
                                    id="quote-deliveryTime"
                                    defaultValue={quote?.deliveryTime || ""}
                                    placeholder="Ej: 15 días hábiles"
                                    className="w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-[var(--card-border)] rounded-lg focus:ring-2 focus:ring-nearby-dark/15 focus:border-nearby-dark/50 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Status */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="quote-status" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                                    Estado *
                                </label>
                                <select
                                    id="quote-status"
                                    defaultValue={quote?.status || "BORRADOR"}
                                    required
                                    className="w-full px-3 py-3 sm:py-2.5 text-base sm:text-sm border border-[var(--card-border)] rounded-lg focus:ring-2 focus:ring-nearby-dark/15 focus:border-nearby-dark/50 transition-colors bg-[var(--card-bg)]"
                                >
                                    <option value="BORRADOR">Borrador</option>
                                    <option value="ACTIVA">Activa</option>
                                    <option value="RECHAZADA">Rechazada</option>
                                    <option value="APROBADA">Aprobada</option>
                                </select>
                            </div>
                            <div>
                                <div className="h-full rounded-lg border border-dashed border-[var(--card-border)] bg-[var(--surface-2)] px-4 py-3 flex items-center">
                                    <p className="text-xs text-[var(--muted-text)]">
                                        El estado se mantiene separado para que puedas revisar el impacto del impuesto antes de activar o aprobar la cotización.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Reference catalog for sales */}
                        {projectRateReferences.length > 0 && (
                            <div className="rounded-lg border border-nearby-dark/30 bg-nearby-dark/5 p-4">
                                <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1">
                                    Referencia comercial (solo guía)
                                </h3>
                                <p className="text-xs text-[var(--muted-text)] mb-3">
                                    Estos valores son referenciales para apoyar la cotización en texto libre.
                                </p>
                                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                    {projectRateReferences.filter((r) => r.isActive).map((reference) => {
                                        const hourlyRate = Number(reference.hourlyRate || 0);
                                        const hours = Number(reference.referenceHours || 0);
                                        const estimated = hourlyRate > 0 && hours > 0 ? hourlyRate * hours : null;

                                        return (
                                            <div key={reference.id} className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] p-2.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-xs font-semibold text-[var(--foreground)] truncate">{reference.name}</p>
                                                    {reference.category && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--hover-bg)] text-[var(--muted-text)]">
                                                            {reference.category}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-[var(--muted-text)] mt-1">
                                                    Hora: <span className="font-medium text-[var(--foreground)]">{formatUSD(reference.hourlyRate)}</span>
                                                    {" • "}
                                                    Horas: <span className="font-medium text-[var(--foreground)]">{reference.referenceHours || "-"}</span>
                                                    {" • "}
                                                    Fijo: <span className="font-medium text-[var(--foreground)]">{formatUSD(reference.fixedPrice)}</span>
                                                </p>
                                                {estimated !== null && (
                                                    <p className="text-[11px] text-nearby-dark dark:text-nearby-dark-300 font-semibold mt-1">
                                                        Estimado {hours}h: {formatUSD(estimated)}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-[var(--card-border)]">
                            <div>
                                {isEditMode && (
                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                        <div className="flex flex-col sm:flex-row gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--surface-2)] p-2">
                                            <label className="sr-only" htmlFor="quote-pdf-format">Formato de impresión</label>
                                            <select
                                                id="quote-pdf-format"
                                                value={pdfFormat}
                                                onChange={(event) => setPdfFormat(event.target.value as QuotePDFFormat)}
                                                disabled={isDeleting}
                                                className="w-full sm:w-36 px-3 py-3 sm:py-2 border border-[var(--card-border)] rounded-md text-sm font-medium text-[var(--foreground)] bg-[var(--card-bg)] disabled:opacity-50"
                                            >
                                                <option value="basic">Básico</option>
                                                <option value="advanced">Avanzado</option>
                                            </select>
                                            <button
                                                type="button"
                                                onClick={generatePDF}
                                                disabled={isDeleting}
                                                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3 sm:py-2 border border-[var(--card-border)] rounded-md shadow-sm text-sm font-medium text-[var(--foreground)] bg-[var(--card-bg)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-50"
                                            >
                                                <Printer size={16} className="mr-2" />
                                                Imprimir PDF
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleDelete}
                                            disabled={isPending || isDeleting}
                                            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3 sm:py-2 border border-red-200 rounded-lg shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <Trash2 size={16} className="mr-2" />
                                            {isDeleting ? "Eliminando..." : "Eliminar"}
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col-reverse sm:flex-row items-center gap-2 sm:gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isDeleting}
                                    className="w-full sm:w-auto px-4 py-3 sm:py-2 border border-[var(--card-border)] rounded-lg shadow-sm text-sm font-medium text-[var(--foreground)] bg-[var(--card-bg)] hover:bg-[var(--surface-2)] transition-colors"
                                >
                                    Cerrar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={isPending || isDeleting || (!isEditMode && hasSavedNewQuote)}
                                    className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3 sm:py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-nearby-dark hover:bg-nearby-dark-600 transition-all active:scale-95 disabled:opacity-50"
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
                    quote={{
                        ...quote,
                        proposalDescription,
                        currency: selectedCurrency,
                        taxType: selectedTaxType,
                        taxId: selectedTaxId || null,
                        taxName: selectedTax?.name || quote.taxName || null,
                        taxRate: Number(selectedTax?.rate || quote.taxRate || 0) || null,
                    }}
                    items={items}
                    companyName={companyName}
                    contactName={contactName}
                    totals={totals}
                    format={pdfFormat}
                    workspace={workspace}
                />
            )}
        </div>
    );

    return createPortal(modal, document.body);
}
