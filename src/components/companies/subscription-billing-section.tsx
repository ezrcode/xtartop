"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { BillingType, CountType } from "@prisma/client";
import {
    getSubscriptionBilling,
    updateBillingSettings,
    addSubscriptionItem,
    updateSubscriptionItem,
    deleteSubscriptionItem,
} from "@/actions/subscription-billing";

interface AdmCloudItem {
    id: string;
    code: string;
    name: string;
    price: number;
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
        setEditingItem(null);
        setModalOpen(true);
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
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Precio</th>
                                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Cantidad</th>
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
                                                    <td className="px-4 py-3 text-right text-dark-slate">${Number(item.price).toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="text-dark-slate">{item.calculatedQuantity}</span>
                                                        {item.countType !== "MANUAL" && (
                                                            <span className="ml-1 text-xs text-gray-400">
                                                                ({item.countType === "ACTIVE_PROJECTS" ? "Proy." : "Usr."})
                                                            </span>
                                                        )}
                                                    </td>
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

            {/* Add/Edit Item Modal */}
            {modalOpen && (
                <SubscriptionItemModal
                    companyId={companyId}
                    item={editingItem}
                    onClose={handleModalClose}
                    onSaved={handleItemSaved}
                />
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmOpen && (
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
                </div>
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
    const [admCloudItems, setAdmCloudItems] = useState<AdmCloudItem[]>([]);
    const [loadingItems, setLoadingItems] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedItemId, setSelectedItemId] = useState(item?.admCloudItemId || "");
    const [selectedItem, setSelectedItem] = useState<AdmCloudItem | null>(null);
    const [countType, setCountType] = useState<CountType>(item?.countType || "MANUAL");
    const [manualQuantity, setManualQuantity] = useState(item?.manualQuantity?.toString() || "");

    // Load ADMCloud items
    useEffect(() => {
        async function loadItems() {
            try {
                setLoadingItems(true);
                const response = await fetch("/api/admcloud/items");
                const data = await response.json();
                
                if (data.items) {
                    setAdmCloudItems(data.items);
                    
                    // If editing, find and set the selected item
                    if (item) {
                        const found = data.items.find((i: AdmCloudItem) => i.id === item.admCloudItemId);
                        if (found) {
                            setSelectedItem(found);
                        } else {
                            // Item not found in ADMCloud, create a placeholder
                            setSelectedItem({
                                id: item.admCloudItemId,
                                code: item.code,
                                name: item.description,
                                price: Number(item.price),
                            });
                        }
                    }
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

    // Update selected item when selection changes
    useEffect(() => {
        if (selectedItemId) {
            const found = admCloudItems.find((i) => i.id === selectedItemId);
            if (found) {
                setSelectedItem(found);
            }
        } else {
            setSelectedItem(null);
        }
    }, [selectedItemId, admCloudItems]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedItem) {
            setError("Selecciona un artículo");
            return;
        }

        if (countType === "MANUAL" && (!manualQuantity || parseInt(manualQuantity) < 0)) {
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
                price: selectedItem.price,
                countType,
                manualQuantity: countType === "MANUAL" ? parseInt(manualQuantity) : undefined,
            };

            if (item) {
                await updateSubscriptionItem(item.id, data);
            } else {
                await addSubscriptionItem(companyId, data);
            }

            onSaved();
        } catch (err) {
            console.error("Error saving item:", err);
            setError("Error al guardar el artículo");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-bold text-dark-slate mb-4">
                    {item ? "Editar artículo" : "Agregar artículo"}
                </h3>

                {loadingItems ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="animate-spin text-nearby-accent" size={24} />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 text-sm text-red-800 bg-red-50 rounded-lg">
                                {error}
                            </div>
                        )}

                        {/* Article selector */}
                        <div>
                            <label className="block text-sm font-medium text-dark-slate mb-1">
                                Artículo
                            </label>
                            <select
                                value={selectedItemId}
                                onChange={(e) => setSelectedItemId(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-graphite-gray rounded-lg focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent"
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

                        {/* Price (read-only) */}
                        <div>
                            <label className="block text-sm font-medium text-dark-slate mb-1">
                                Precio
                            </label>
                            <div className="px-3 py-2 text-sm border border-graphite-gray rounded-lg bg-gray-50 text-dark-slate">
                                {selectedItem ? `$${selectedItem.price.toFixed(2)}` : "-"}
                            </div>
                        </div>

                        {/* Count type */}
                        <div>
                            <label className="block text-sm font-medium text-dark-slate mb-1">
                                Tipo de conteo
                            </label>
                            <select
                                value={countType}
                                onChange={(e) => setCountType(e.target.value as CountType)}
                                className="w-full px-3 py-2 text-sm border border-graphite-gray rounded-lg focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent"
                            >
                                <option value="MANUAL">Manual</option>
                                <option value="ACTIVE_PROJECTS">Proyectos activos</option>
                                <option value="ACTIVE_USERS">Usuarios activos</option>
                            </select>
                        </div>

                        {/* Quantity */}
                        <div>
                            <label className="block text-sm font-medium text-dark-slate mb-1">
                                Cantidad
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={countType === "MANUAL" ? manualQuantity : ""}
                                onChange={(e) => setManualQuantity(e.target.value)}
                                disabled={countType !== "MANUAL"}
                                placeholder={countType !== "MANUAL" ? "Se calculará automáticamente" : ""}
                                className="w-full px-3 py-2 text-sm border border-graphite-gray rounded-lg focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                            {countType === "ACTIVE_PROJECTS" && (
                                <p className="text-xs text-gray-500 mt-1">
                                    Se totalizarán los proyectos con estado &ldquo;Activo&rdquo;
                                </p>
                            )}
                            {countType === "ACTIVE_USERS" && (
                                <p className="text-xs text-gray-500 mt-1">
                                    Se totalizarán los usuarios con estado &ldquo;Activo&rdquo;
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-dark-slate bg-white border border-graphite-gray rounded-lg hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={saving || !selectedItem}
                                className="px-4 py-2 text-sm font-medium text-white bg-nearby-dark rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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
