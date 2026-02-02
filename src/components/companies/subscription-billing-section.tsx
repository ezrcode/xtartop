"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { BillingType, CountType } from "@prisma/client";
import {
    getSubscriptionBilling,
    updateBillingSettings,
    addSubscriptionItem,
    updateSubscriptionItem,
    deleteSubscriptionItem,
} from "@/actions/subscription-billing";

interface PriceOption {
    priceListId: string;
    priceListName: string;
    price: number;
    currency: string;
}

interface AdmCloudItem {
    id: string;
    code: string;
    name: string;
    prices: PriceOption[];
}

interface SubscriptionItemWithQuantity {
    id: string;
    admCloudItemId: string;
    code: string;
    description: string;
    price: { toString(): string };
    countType: CountType;
    manualQuantity: number | null;
    calculatedQuantity: number;
    subtotal: number;
}

interface SubscriptionBillingData {
    id: string;
    billingType: BillingType;
    billingDay: number;
    items: SubscriptionItemWithQuantity[];
    total: number;
    activeProjects: number;
    activeUsers: number;
}

interface SubscriptionBillingSectionProps {
    companyId: string;
}

export function SubscriptionBillingSection({ companyId }: SubscriptionBillingSectionProps) {
    const [billing, setBilling] = useState<SubscriptionBillingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [billingType, setBillingType] = useState<BillingType>("STANDARD");
    const [billingDay, setBillingDay] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<SubscriptionItemWithQuantity | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<string | null>(null);

    const loadBillingData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getSubscriptionBilling(companyId);
            if (data) {
                setBilling(data);
                setBillingType(data.billingType);
                setBillingDay(data.billingDay);
            }
        } catch (error) {
            console.error("Error loading billing data:", error);
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        loadBillingData();
    }, [loadBillingData]);

    const handleBillingTypeChange = async (type: BillingType) => {
        setBillingType(type);
        setSaving(true);
        try {
            await updateBillingSettings(companyId, type, billingDay);
            await loadBillingData();
        } catch (error) {
            console.error("Error updating billing type:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleBillingDayChange = async (day: number) => {
        setBillingDay(day);
        setSaving(true);
        try {
            await updateBillingSettings(companyId, billingType, day);
        } catch (error) {
            console.error("Error updating billing day:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleAddItem = () => {
        console.log("[SubscriptionBillingSection] handleAddItem clicked");
        setEditingItem(null);
        setModalOpen(true);
        console.log("[SubscriptionBillingSection] modalOpen set to true");
    };

    const handleEditItem = (item: SubscriptionItemWithQuantity) => {
        setEditingItem(item);
        setModalOpen(true);
    };

    const handleDeleteItem = async (itemId: string) => {
        try {
            await deleteSubscriptionItem(itemId);
            await loadBillingData();
            setDeleteConfirmOpen(null);
        } catch (error) {
            console.error("Error deleting item:", error);
        }
    };

    const handleModalClose = () => {
        setModalOpen(false);
        setEditingItem(null);
    };

    const handleItemSaved = async () => {
        await loadBillingData();
        handleModalClose();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-nearby-accent" size={24} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-md font-semibold text-nearby-dark mb-3">
                    Cobro de suscripción
                </h3>
                
                {/* Radio buttons for billing type */}
                <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="radio"
                                name="billingType"
                                checked={billingType === "STANDARD"}
                                onChange={() => handleBillingTypeChange("STANDARD")}
                                className="w-4 h-4 text-nearby-accent border-gray-300 focus:ring-nearby-accent"
                            />
                            <span className="ml-2 text-sm font-medium text-dark-slate">Estándar</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="radio"
                                name="billingType"
                                checked={billingType === "CUSTOM"}
                                onChange={() => handleBillingTypeChange("CUSTOM")}
                                className="w-4 h-4 text-nearby-accent border-gray-300 focus:ring-nearby-accent"
                            />
                            <span className="ml-2 text-sm font-medium text-dark-slate">Personalizado</span>
                        </label>
                        {saving && <Loader2 className="animate-spin text-nearby-accent" size={16} />}
                    </div>

                    {/* Standard billing items table */}
                    {billingType === "STANDARD" && (
                        <div className="border border-graphite-gray rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-graphite-gray">
                                <span className="text-sm font-medium text-dark-slate">Artículos de suscripción</span>
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="flex items-center px-2 py-1 text-xs font-medium text-nearby-accent hover:bg-nearby-accent/10 rounded-md transition-colors"
                                >
                                    <Plus size={14} className="mr-1" />
                                    Agregar
                                </button>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Precio</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                                            <th className="px-4 py-2 w-20"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-graphite-gray">
                                        {billing?.items && billing.items.length > 0 ? (
                                            billing.items.map((item) => (
                                                <tr key={item.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-dark-slate font-mono text-xs">{item.code}</td>
                                                    <td className="px-4 py-3 text-dark-slate">{item.description}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="text-dark-slate">{item.calculatedQuantity}</span>
                                                        {item.countType !== "MANUAL" && (
                                                            <span className="ml-1 text-xs text-gray-400">
                                                                ({item.countType === "ACTIVE_PROJECTS" ? "Proy." : "Usr."})
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-dark-slate">${Number(item.price).toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-right font-medium text-dark-slate">${item.subtotal.toFixed(2)}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center justify-end space-x-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEditItem(item)}
                                                                className="p-1 text-gray-400 hover:text-nearby-accent rounded transition-colors"
                                                            >
                                                                <Pencil size={14} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setDeleteConfirmOpen(item.id)}
                                                                className="p-1 text-gray-400 hover:text-error-red rounded transition-colors"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                                                    No hay artículos configurados
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Custom billing placeholder */}
                    {billingType === "CUSTOM" && (
                        <div className="border border-dashed border-graphite-gray rounded-lg p-8 text-center text-gray-400">
                            <p>Cobro personalizado - Próximamente</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Billing day and total */}
            <div className="border-t border-graphite-gray pt-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center space-x-3">
                        <label className="text-sm font-medium text-dark-slate whitespace-nowrap">
                            Día de cobro:
                        </label>
                        <select
                            value={billingDay}
                            onChange={(e) => handleBillingDayChange(parseInt(e.target.value))}
                            className="w-20 px-2 py-1.5 text-sm border border-graphite-gray rounded-md focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent"
                        >
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                <option key={day} value={day}>{day}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="flex items-center space-x-3 bg-gray-50 px-4 py-2 rounded-lg">
                        <span className="text-sm font-medium text-gray-500">Total suscripción:</span>
                        <span className="text-lg font-bold text-nearby-dark">
                            ${billing?.total?.toFixed(2) || "0.00"}
                        </span>
                    </div>
                </div>

                {billing && (
                    <div className="text-xs text-gray-400 flex items-center space-x-4">
                        <span>Proyectos activos: {billing.activeProjects}</span>
                        <span>Usuarios activos: {billing.activeUsers}</span>
                    </div>
                )}
            </div>

            {/* Add/Edit Item Modal - Using Portal to render outside parent form */}
            {modalOpen && typeof document !== 'undefined' && createPortal(
                <SubscriptionItemModal
                    companyId={companyId}
                    item={editingItem}
                    onClose={handleModalClose}
                    onSaved={handleItemSaved}
                />,
                document.body
            )}

            {/* Delete Confirmation Modal - Using Portal */}
            {deleteConfirmOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold text-dark-slate mb-2">Eliminar artículo</h3>
                        <p className="text-gray-600 mb-6 text-sm">
                            ¿Estás seguro de que deseas eliminar este artículo de la suscripción?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setDeleteConfirmOpen(null)}
                                className="px-4 py-2 text-sm font-medium text-dark-slate bg-white border border-graphite-gray rounded-lg hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDeleteItem(deleteConfirmOpen)}
                                className="px-4 py-2 text-sm font-medium text-white bg-error-red rounded-lg hover:bg-red-700"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

// Modal component for adding/editing subscription items
interface SubscriptionItemModalProps {
    companyId: string;
    item: SubscriptionItemWithQuantity | null;
    onClose: () => void;
    onSaved: () => void;
}

function SubscriptionItemModal({ companyId, item, onClose, onSaved }: SubscriptionItemModalProps) {
    console.log("[SubscriptionItemModal] Modal mounted, companyId:", companyId, "editing item:", item?.id);
    
    const [admCloudItems, setAdmCloudItems] = useState<AdmCloudItem[]>([]);
    const [loadingItems, setLoadingItems] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedItemId, setSelectedItemId] = useState(item?.admCloudItemId || "");
    const [selectedItem, setSelectedItem] = useState<AdmCloudItem | null>(null);
    const [selectedPriceListId, setSelectedPriceListId] = useState<string>("");
    const [selectedPrice, setSelectedPrice] = useState<PriceOption | null>(null);
    const [countType, setCountType] = useState<CountType>(item?.countType || "MANUAL");
    const [manualQuantity, setManualQuantity] = useState(item?.manualQuantity?.toString() || "");

    // Load ADMCloud items
    useEffect(() => {
        console.log("[SubscriptionItemModal] useEffect triggered, starting fetch...");
        async function loadItems() {
            try {
                setLoadingItems(true);
                setError(null);
                console.log("[SubscriptionItemModal] Fetching /api/admcloud/items...");
                const response = await fetch("/api/admcloud/items");
                console.log("[SubscriptionItemModal] Response status:", response.status);
                const data = await response.json();
                
                console.log("[SubscriptionItemModal] ADMCloud items response:", data);
                
                if (data.error) {
                    setError(data.error);
                    return;
                }
                
                if (data.message && (!data.items || data.items.length === 0)) {
                    setError(data.message);
                    return;
                }
                
                if (data.items && Array.isArray(data.items)) {
                    setAdmCloudItems(data.items);
                    
                    if (data.items.length === 0) {
                        setError("No se encontraron artículos en ADMCloud");
                        return;
                    }
                    
                    // If editing, find and set the selected item
                    if (item) {
                        console.log("[SubscriptionItemModal] Editing mode - looking for item:", item.admCloudItemId);
                        const found = data.items.find((i: AdmCloudItem) => i.id === item.admCloudItemId);
                        if (found) {
                            console.log("[SubscriptionItemModal] Found item:", found.code, "with", found.prices.length, "prices");
                            setSelectedItem(found);
                            setSelectedItemId(found.id);
                            // Try to find matching price by value, otherwise use first
                            const savedPrice = Number(item.price);
                            const matchingPrice = found.prices.find(
                                (p: PriceOption) => p.price === savedPrice
                            ) || found.prices[0];
                            console.log("[SubscriptionItemModal] Matching price:", matchingPrice?.priceListName, matchingPrice?.price);
                            if (matchingPrice) {
                                setSelectedPriceListId(matchingPrice.priceListId);
                                setSelectedPrice(matchingPrice);
                            }
                        } else {
                            console.log("[SubscriptionItemModal] Item not found in ADMCloud, creating placeholder");
                            // Item not found in ADMCloud, create a placeholder
                            const placeholderPrice: PriceOption = {
                                priceListId: "saved",
                                priceListName: "Precio guardado",
                                price: Number(item.price),
                                currency: "USD",
                            };
                            setSelectedItem({
                                id: item.admCloudItemId,
                                code: item.code,
                                name: item.description,
                                prices: [placeholderPrice],
                            });
                            setSelectedItemId(item.admCloudItemId);
                            setSelectedPriceListId("saved");
                            setSelectedPrice(placeholderPrice);
                        }
                    }
                    
                } else {
                    setError("Respuesta inválida de ADMCloud");
                }
            } catch (err) {
                console.error("Error loading ADMCloud items:", err);
                setError("Error al cargar artículos de ADMCloud");
            } finally {
                setLoadingItems(false);
            }
        }
        loadItems();
    }, [item]);

    // Handle item selection change (only for user-initiated changes, not initial load)
    const handleItemChange = (newItemId: string) => {
        console.log("[SubscriptionItemModal] handleItemChange:", newItemId);
        setSelectedItemId(newItemId);
        
        if (newItemId) {
            const found = admCloudItems.find((i) => i.id === newItemId);
            if (found) {
                setSelectedItem(found);
                // Auto-select first price (or only price)
                if (found.prices.length > 0) {
                    setSelectedPriceListId(found.prices[0].priceListId);
                    setSelectedPrice(found.prices[0]);
                }
            }
        } else {
            setSelectedItem(null);
            setSelectedPrice(null);
            setSelectedPriceListId("");
        }
    };

    // Handle price list selection change
    const handlePriceListChange = (newPriceListId: string) => {
        console.log("[SubscriptionItemModal] handlePriceListChange:", newPriceListId);
        setSelectedPriceListId(newPriceListId);
        
        if (selectedItem && newPriceListId) {
            const price = selectedItem.prices.find(p => p.priceListId === newPriceListId);
            if (price) {
                setSelectedPrice(price);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        console.log("[SubscriptionItemModal] handleSubmit called");
        e.preventDefault();
        e.stopPropagation();
        
        console.log("[SubscriptionItemModal] selectedItem:", selectedItem);
        console.log("[SubscriptionItemModal] selectedPrice:", selectedPrice);
        console.log("[SubscriptionItemModal] countType:", countType);
        console.log("[SubscriptionItemModal] manualQuantity:", manualQuantity);
        
        if (!selectedItem) {
            console.log("[SubscriptionItemModal] No selectedItem, showing error");
            setError("Selecciona un artículo");
            return;
        }

        if (!selectedPrice) {
            console.log("[SubscriptionItemModal] No selectedPrice, showing error");
            setError("Selecciona una lista de precios");
            return;
        }

        if (countType === "MANUAL" && (!manualQuantity || parseInt(manualQuantity) < 0)) {
            console.log("[SubscriptionItemModal] Invalid quantity, showing error");
            setError("Ingresa una cantidad válida");
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const data = {
                admCloudItemId: selectedItem.id,
                code: selectedItem.code,
                description: selectedItem.name,
                price: selectedPrice.price,
                countType,
                manualQuantity: countType === "MANUAL" ? parseInt(manualQuantity) : undefined,
            };
            
            console.log("[SubscriptionItemModal] Saving data:", data);

            if (item) {
                console.log("[SubscriptionItemModal] Updating item:", item.id);
                await updateSubscriptionItem(item.id, data);
            } else {
                console.log("[SubscriptionItemModal] Adding new item for company:", companyId);
                await addSubscriptionItem(companyId, data);
            }

            console.log("[SubscriptionItemModal] Save successful, calling onSaved");
            onSaved();
        } catch (err) {
            console.error("[SubscriptionItemModal] Error saving item:", err);
            setError("Error al guardar el artículo");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-[var(--foreground)] mb-4">
                    {item ? "Editar artículo" : "Agregar artículo"}
                </h3>

                {loadingItems ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="animate-spin text-nearby-accent" size={24} />
                        <span className="ml-2 text-sm text-[var(--muted-text)]">Cargando artículos de ADMCloud...</span>
                    </div>
                ) : error && admCloudItems.length === 0 ? (
                    <div className="space-y-4">
                        <div className="p-4 text-sm text-amber-800 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-200 rounded-lg">
                            <p className="font-medium">No se pudieron cargar artículos</p>
                            <p className="mt-1">{error}</p>
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2.5 min-h-[44px] text-sm font-medium text-[var(--foreground)] bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg hover:bg-[var(--hover-bg)]"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 text-sm text-red-800 bg-red-50 dark:bg-red-900/20 dark:text-red-200 rounded-lg">
                                {error}
                            </div>
                        )}

                        {/* Article selector */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                                Artículo
                            </label>
                            <select
                                value={selectedItemId}
                                onChange={(e) => handleItemChange(e.target.value)}
                                className="w-full px-3 py-2.5 min-h-[44px] text-base sm:text-sm bg-[var(--input-bg)] text-[var(--foreground)] border border-[var(--input-border)] rounded-lg focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent"
                                required
                            >
                                <option value="">Seleccionar artículo...</option>
                                {admCloudItems.map((admItem) => (
                                    <option key={admItem.id} value={admItem.id}>
                                        {admItem.code} - {admItem.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Price list selector - only show if item has multiple prices */}
                        {selectedItem && selectedItem.prices.length > 1 && (
                            <div>
                                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                                    Lista de precios
                                </label>
                                <select
                                    value={selectedPriceListId}
                                    onChange={(e) => handlePriceListChange(e.target.value)}
                                    className="w-full px-3 py-2.5 min-h-[44px] text-base sm:text-sm bg-[var(--input-bg)] text-[var(--foreground)] border border-[var(--input-border)] rounded-lg focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent"
                                    required
                                >
                                    {selectedItem.prices.map((priceOption) => (
                                        <option key={priceOption.priceListId} value={priceOption.priceListId}>
                                            {priceOption.priceListName} - ${priceOption.price.toFixed(2)} {priceOption.currency}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-[var(--muted-text)] mt-1">
                                    Este artículo tiene {selectedItem.prices.length} listas de precios disponibles
                                </p>
                            </div>
                        )}

                        {/* Price (read-only) */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                                Precio {selectedItem && selectedItem.prices.length === 1 && (
                                    <span className="font-normal text-[var(--muted-text)]">
                                        ({selectedItem.prices[0]?.priceListName})
                                    </span>
                                )}
                            </label>
                            <div className="px-3 py-2.5 min-h-[44px] flex items-center text-base sm:text-sm border border-[var(--input-border)] rounded-lg bg-[var(--hover-bg)] text-[var(--foreground)]">
                                {selectedPrice ? (
                                    <span className="font-medium">
                                        ${selectedPrice.price.toFixed(2)} <span className="text-[var(--muted-text)] font-normal">{selectedPrice.currency}</span>
                                    </span>
                                ) : "-"}
                            </div>
                        </div>

                        {/* Count type */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                                Tipo de conteo
                            </label>
                            <select
                                value={countType}
                                onChange={(e) => setCountType(e.target.value as CountType)}
                                className="w-full px-3 py-2.5 min-h-[44px] text-base sm:text-sm bg-[var(--input-bg)] text-[var(--foreground)] border border-[var(--input-border)] rounded-lg focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent"
                            >
                                <option value="MANUAL">Manual</option>
                                <option value="ACTIVE_PROJECTS">Proyectos activos</option>
                                <option value="ACTIVE_USERS">Usuarios activos</option>
                            </select>
                        </div>

                        {/* Quantity */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                                Cantidad
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={countType === "MANUAL" ? manualQuantity : ""}
                                onChange={(e) => setManualQuantity(e.target.value)}
                                disabled={countType !== "MANUAL"}
                                placeholder={countType !== "MANUAL" ? "Se calculará automáticamente" : ""}
                                className="w-full px-3 py-2.5 min-h-[44px] text-base sm:text-sm bg-[var(--input-bg)] text-[var(--foreground)] placeholder:text-[var(--muted-text)] border border-[var(--input-border)] rounded-lg focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            {countType === "ACTIVE_PROJECTS" && (
                                <p className="text-xs text-[var(--muted-text)] mt-1">
                                    Se totalizarán los proyectos con estado &ldquo;Activo&rdquo;
                                </p>
                            )}
                            {countType === "ACTIVE_USERS" && (
                                <p className="text-xs text-[var(--muted-text)] mt-1">
                                    Se totalizarán los usuarios con estado &ldquo;Activo&rdquo;
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2.5 min-h-[44px] text-sm font-medium text-[var(--foreground)] bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg hover:bg-[var(--hover-bg)]"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={saving || !selectedItem || !selectedPrice}
                                className="px-4 py-2.5 min-h-[44px] text-sm font-medium text-white bg-nearby-dark rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                                {saving && <Loader2 className="animate-spin mr-2" size={14} />}
                                {item ? "Guardar cambios" : "Agregar"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
