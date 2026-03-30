"use client";

import { useState, useCallback } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Save,
    Loader2,
    Plus,
    Trash2,
    Send,
    RefreshCw,
    CheckCircle,
    XCircle,
    ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import {
    createPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    type PurchaseOrderState,
} from "@/actions/purchase-orders";
import { sendOrderToDecima, syncOrderFromDecima } from "@/actions/decima";
import { PurchaseOrderStatus } from "@prisma/client";

interface OrderItem {
    productCode: string;
    productName: string;
    quantity: number;
}

interface PurchaseOrderFormProps {
    order?: {
        id: string;
        orderNumber: number;
        period: string;
        notes: string | null;
        externalReference: string | null;
        status: PurchaseOrderStatus;
        decimaOrderId: string | null;
        decimaStatus: string | null;
        decimaLastSync: Date | null;
        supplierId: string;
        supplier: { id: string; name: string; logoUrl: string | null };
        items: { id: string; productCode: string; productName: string | null; quantity: number }[];
    };
    suppliers: { id: string; name: string; logoUrl: string | null }[];
    decimaProducts: { code: string; name: string }[];
    decimaEnabled: boolean;
    isEditMode: boolean;
}

const statusConfig: Record<PurchaseOrderStatus, { label: string; className: string }> = {
    BORRADOR: { label: "Borrador", className: "bg-[var(--surface-3)] text-gray-800" },
    ENVIADA: { label: "Enviada", className: "bg-nearby-accent/10 text-nearby-accent" },
    CONFIRMADA: { label: "Confirmada", className: "bg-success-green/10 text-success-green" },
    RECIBIDA: { label: "Recibida", className: "bg-purple-100 text-purple-800" },
    CANCELADA: { label: "Cancelada", className: "bg-error-red/10 text-error-red" },
};

function SubmitButton({ label = "Guardar" }: { label?: string }) {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-nearby-dark rounded-xl hover:bg-nearby-dark-600 transition-colors disabled:opacity-50"
        >
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {pending ? "Guardando..." : label}
        </button>
    );
}

export function PurchaseOrderForm({
    order,
    suppliers,
    decimaProducts,
    decimaEnabled,
    isEditMode,
}: PurchaseOrderFormProps) {
    const router = useRouter();

    // Form state
    const [supplierId, setSupplierId] = useState(order?.supplierId || "");
    const [period, setPeriod] = useState(order?.period || new Date().toISOString().slice(0, 7));
    const [notes, setNotes] = useState(order?.notes || "");
    const [externalReference, setExternalReference] = useState(order?.externalReference || "");
    const [items, setItems] = useState<OrderItem[]>(
        order?.items.map((i) => ({
            productCode: i.productCode,
            productName: i.productName || "",
            quantity: i.quantity,
        })) || [{ productCode: "", productName: "", quantity: 1 }]
    );

    // Decima sync state
    const [sendingToDecima, setSendingToDecima] = useState(false);
    const [syncingFromDecima, setSyncingFromDecima] = useState(false);
    const [decimaMessage, setDecimaMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Delete state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const initialState: PurchaseOrderState = {};
    const boundAction = isEditMode && order
        ? updatePurchaseOrder.bind(null, order.id)
        : createPurchaseOrder;
    const [state, formAction] = useFormState(boundAction, initialState);

    const isReadonly = order && order.status !== "BORRADOR";

    // Item management
    const addItem = () => {
        setItems([...items, { productCode: "", productName: "", quantity: 1 }]);
    };

    const removeItem = (index: number) => {
        if (items.length <= 1) return;
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: keyof OrderItem, value: string | number) => {
        const updated = [...items];
        updated[index] = { ...updated[index], [field]: value };

        // Auto-fill product name from Décima catalog
        if (field === "productCode" && decimaProducts.length > 0) {
            const product = decimaProducts.find((p) => p.code === value);
            if (product) {
                updated[index].productName = product.name;
            }
        }

        setItems(updated);
    };

    // Decima actions
    const handleSendToDecima = async () => {
        if (!order) return;
        setSendingToDecima(true);
        setDecimaMessage(null);

        const result = await sendOrderToDecima(order.id);
        if (result.success) {
            setDecimaMessage({ type: "success", text: "Orden enviada a Décima exitosamente" });
            router.refresh();
        } else {
            setDecimaMessage({ type: "error", text: result.error || "Error al enviar a Décima" });
        }

        setSendingToDecima(false);
    };

    const handleSyncFromDecima = async () => {
        if (!order) return;
        setSyncingFromDecima(true);
        setDecimaMessage(null);

        const result = await syncOrderFromDecima(order.id);
        if (result.success) {
            setDecimaMessage({ type: "success", text: `Estado sincronizado: ${result.status}` });
            router.refresh();
        } else {
            setDecimaMessage({ type: "error", text: result.error || "Error al sincronizar" });
        }

        setSyncingFromDecima(false);
    };

    const handleDelete = async () => {
        if (!order) return;
        setDeleting(true);
        await deletePurchaseOrder(order.id);
    };

    return (
        <div className="min-h-screen bg-[var(--surface-0)] py-6 sm:py-8">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-6">
                    <Link
                        href="/app/purchases"
                        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-text)] hover:text-[var(--foreground)] mb-4 transition-colors"
                    >
                        <ArrowLeft size={16} />
                        Órdenes de Compra
                    </Link>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-nearby-accent/10 rounded-xl">
                                <ShoppingCart size={24} className="text-nearby-accent" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-[var(--foreground)]">
                                    {isEditMode ? `OC-${String(order!.orderNumber).padStart(4, "0")}` : "Nueva Orden de Compra"}
                                </h1>
                                {isEditMode && order && (
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[order.status].className}`}>
                                            {statusConfig[order.status].label}
                                        </span>
                                        {order.decimaOrderId && (
                                            <span className="text-xs text-[var(--muted-text)] font-mono">
                                                Décima: {order.decimaOrderId}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status messages */}
                {state?.message && (
                    <div className={`mb-4 p-4 rounded-xl text-sm ${
                        state.message.includes("exitosamente")
                            ? "bg-success-green/10 text-success-green"
                            : "bg-error-red/10 text-error-red"
                    }`}>
                        {state.message}
                    </div>
                )}

                {decimaMessage && (
                    <div className={`mb-4 flex items-center gap-2 p-4 rounded-xl text-sm ${
                        decimaMessage.type === "success"
                            ? "bg-success-green/10 text-success-green"
                            : "bg-error-red/10 text-error-red"
                    }`}>
                        {decimaMessage.type === "success" ? <CheckCircle size={16} /> : <XCircle size={16} />}
                        {decimaMessage.text}
                    </div>
                )}

                {/* Decima Actions Bar */}
                {isEditMode && order && decimaEnabled && (
                    <div className="mb-6 p-4 bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-[var(--foreground)]">Décima Portal</p>
                            <p className="text-xs text-[var(--muted-text)]">
                                {order.decimaOrderId
                                    ? `Última sincronización: ${order.decimaLastSync ? new Date(order.decimaLastSync).toLocaleString("es-DO") : "N/A"}`
                                    : "Esta orden no ha sido enviada a Décima"}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {!order.decimaOrderId && order.status === "BORRADOR" && (
                                <button
                                    type="button"
                                    onClick={handleSendToDecima}
                                    disabled={sendingToDecima}
                                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                >
                                    {sendingToDecima ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                    Enviar a Décima
                                </button>
                            )}
                            {order.decimaOrderId && (
                                <button
                                    type="button"
                                    onClick={handleSyncFromDecima}
                                    disabled={syncingFromDecima}
                                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--foreground)] bg-[var(--hover-bg)] rounded-lg border border-[var(--card-border)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-50"
                                >
                                    {syncingFromDecima ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                    Sincronizar Estado
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Form */}
                <form action={formAction} className="space-y-6">
                    <input type="hidden" name="items" value={JSON.stringify(items)} />

                    {/* Supplier & Period */}
                    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-6 space-y-4">
                        <h2 className="text-base font-semibold text-[var(--foreground)]">Datos Generales</h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="supplierId" className="block text-sm font-medium text-[var(--foreground)]">
                                    Proveedor <span className="text-error-red">*</span>
                                </label>
                                <select
                                    id="supplierId"
                                    name="supplierId"
                                    value={supplierId}
                                    onChange={(e) => setSupplierId(e.target.value)}
                                    disabled={!!isReadonly}
                                    className="w-full px-3 py-2.5 text-sm border border-[var(--card-border)] rounded-xl bg-[var(--card-bg)] shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors disabled:opacity-50"
                                    required
                                >
                                    <option value="">Selecciona un proveedor</option>
                                    {suppliers.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                                {suppliers.length === 0 && (
                                    <p className="text-xs text-[var(--muted-text)]">
                                        No hay empresas con estado &quot;Proveedor&quot;.{" "}
                                        <Link href="/app/companies" className="text-nearby-accent hover:underline">
                                            Crear una empresa
                                        </Link>{" "}
                                        con ese estado primero.
                                    </p>
                                )}
                                {state?.errors?.supplierId && (
                                    <p className="text-sm text-error-red">{state.errors.supplierId}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="period" className="block text-sm font-medium text-[var(--foreground)]">
                                    Periodo <span className="text-error-red">*</span>
                                </label>
                                <input
                                    type="month"
                                    id="period"
                                    name="period"
                                    value={period}
                                    onChange={(e) => setPeriod(e.target.value)}
                                    disabled={!!isReadonly}
                                    className="w-full px-3 py-2.5 text-sm border border-[var(--card-border)] rounded-xl bg-[var(--card-bg)] shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors disabled:opacity-50"
                                    required
                                />
                                {state?.errors?.period && (
                                    <p className="text-sm text-error-red">{state.errors.period}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="externalReference" className="block text-sm font-medium text-[var(--foreground)]">
                                    Referencia Externa
                                </label>
                                <input
                                    type="text"
                                    id="externalReference"
                                    name="externalReference"
                                    value={externalReference}
                                    onChange={(e) => setExternalReference(e.target.value)}
                                    disabled={!!isReadonly}
                                    placeholder="ej: REF-001"
                                    className="w-full px-3 py-2.5 text-sm border border-[var(--card-border)] rounded-xl bg-[var(--card-bg)] shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors disabled:opacity-50"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="notes" className="block text-sm font-medium text-[var(--foreground)]">
                                    Notas
                                </label>
                                <input
                                    type="text"
                                    id="notes"
                                    name="notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    disabled={!!isReadonly}
                                    placeholder="Notas adicionales..."
                                    className="w-full px-3 py-2.5 text-sm border border-[var(--card-border)] rounded-xl bg-[var(--card-bg)] shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors disabled:opacity-50"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-semibold text-[var(--foreground)]">
                                Items ({items.length})
                            </h2>
                            {!isReadonly && (
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-nearby-accent bg-nearby-accent/10 rounded-lg hover:bg-nearby-accent/20 transition-colors"
                                >
                                    <Plus size={14} />
                                    Agregar Item
                                </button>
                            )}
                        </div>

                        {state?.errors?.items && (
                            <p className="text-sm text-error-red">{state.errors.items}</p>
                        )}

                        <div className="space-y-3">
                            {/* Header */}
                            <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-1">
                                <div className="col-span-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">
                                    Código Producto
                                </div>
                                <div className="col-span-4 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">
                                    Nombre
                                </div>
                                <div className="col-span-2 text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider">
                                    Cantidad
                                </div>
                                <div className="col-span-2" />
                            </div>

                            {items.map((item, index) => (
                                <div
                                    key={index}
                                    className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 bg-[var(--hover-bg)] rounded-xl border border-[var(--card-border)]"
                                >
                                    <div className="sm:col-span-4">
                                        <label className="sm:hidden text-xs font-medium text-[var(--muted-text)] mb-1 block">
                                            Código Producto
                                        </label>
                                        {decimaProducts.length > 0 ? (
                                            <select
                                                value={item.productCode}
                                                onChange={(e) => updateItem(index, "productCode", e.target.value)}
                                                disabled={!!isReadonly}
                                                className="w-full px-3 py-2 text-sm border border-[var(--card-border)] rounded-lg bg-[var(--card-bg)] disabled:opacity-50"
                                            >
                                                <option value="">Seleccionar...</option>
                                                {decimaProducts.map((p) => (
                                                    <option key={p.code} value={p.code}>
                                                        {p.code}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                value={item.productCode}
                                                onChange={(e) => updateItem(index, "productCode", e.target.value)}
                                                disabled={!!isReadonly}
                                                placeholder="CRM-PROJECT"
                                                className="w-full px-3 py-2 text-sm border border-[var(--card-border)] rounded-lg bg-[var(--card-bg)] font-mono disabled:opacity-50"
                                            />
                                        )}
                                    </div>
                                    <div className="sm:col-span-4">
                                        <label className="sm:hidden text-xs font-medium text-[var(--muted-text)] mb-1 block">
                                            Nombre
                                        </label>
                                        <input
                                            type="text"
                                            value={item.productName}
                                            onChange={(e) => updateItem(index, "productName", e.target.value)}
                                            disabled={!!isReadonly}
                                            placeholder="Nombre del producto"
                                            className="w-full px-3 py-2 text-sm border border-[var(--card-border)] rounded-lg bg-[var(--card-bg)] disabled:opacity-50"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="sm:hidden text-xs font-medium text-[var(--muted-text)] mb-1 block">
                                            Cantidad
                                        </label>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                                            disabled={!!isReadonly}
                                            min={1}
                                            className="w-full px-3 py-2 text-sm border border-[var(--card-border)] rounded-lg bg-[var(--card-bg)] disabled:opacity-50"
                                        />
                                    </div>
                                    <div className="sm:col-span-2 flex items-center justify-end">
                                        {!isReadonly && items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeItem(index)}
                                                className="p-2 text-error-red hover:bg-error-red/10 rounded-lg transition-colors"
                                                title="Eliminar item"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2">
                        <div>
                            {isEditMode && order?.status === "BORRADOR" && (
                                <>
                                    {showDeleteConfirm ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-error-red">¿Eliminar esta orden?</span>
                                            <button
                                                type="button"
                                                onClick={handleDelete}
                                                disabled={deleting}
                                                className="px-3 py-1.5 text-xs font-medium text-white bg-error-red rounded-lg hover:bg-red-700 disabled:opacity-50"
                                            >
                                                {deleting ? "Eliminando..." : "Sí, eliminar"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowDeleteConfirm(false)}
                                                className="px-3 py-1.5 text-xs font-medium text-[var(--foreground)] bg-[var(--hover-bg)] rounded-lg"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="inline-flex items-center gap-1.5 text-sm text-error-red hover:text-red-700"
                                        >
                                            <Trash2 size={14} />
                                            Eliminar
                                        </button>
                                    )}
                                </>
                            )}
                        </div>

                        {!isReadonly && (
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    name="action"
                                    value="saveAndClose"
                                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[var(--foreground)] bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl hover:bg-[var(--hover-bg)] transition-colors"
                                >
                                    Guardar y Cerrar
                                </button>
                                <SubmitButton />
                            </div>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
