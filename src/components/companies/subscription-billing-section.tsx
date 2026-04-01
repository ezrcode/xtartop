"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Plus, Pencil, Trash2, Loader2, FileText, Download } from "lucide-react";
import { BillingType, CountType, CalculatedBase } from "@prisma/client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
    getSubscriptionBilling,
    updateBillingSettings,
    updateBillingTaxGroup,
    addSubscriptionItem,
    updateSubscriptionItem,
    deleteSubscriptionItem,
    toggleAutoBilling,
} from "@/actions/subscription-billing";
import { getAdmCloudTaxGroups } from "@/actions/admcloud";
import { formatMoney } from "@/lib/format";

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
    calculatedBase: CalculatedBase | null;
    calculatedSubtract: number | null;
    calculatedQuantity: number;
    subtotal: number;
}

interface TaxGroupOption {
    id: string;
    name: string;
    taxScheduleId: string;
}

interface SubscriptionBillingData {
    id: string;
    billingType: BillingType;
    autoBillingEnabled: boolean;
    billingDay: number;
    billingMonthOffset: number;
    admCloudTaxGroupId: string | null;
    admCloudTaxGroup: TaxGroupOption | null;
    items: SubscriptionItemWithQuantity[];
    total: number;
    activeProjects: number;
    activeUsers: number;
    usageInsights: {
        users: Array<{
            key: string;
            label: string;
            activated: number;
            deactivated: number;
            activeAtEnd: number;
        }>;
        projects: Array<{
            key: string;
            label: string;
            activated: number;
            deactivated: number;
            activeAtEnd: number;
        }>;
        currentMonthLabel: string;
        previousMonthLabel: string;
    };
}

interface SubscriptionBillingSectionProps {
    companyId: string;
}

export function SubscriptionBillingSection({ companyId }: SubscriptionBillingSectionProps) {
    const [billing, setBilling] = useState<SubscriptionBillingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [billingType, setBillingType] = useState<BillingType>("STANDARD");
    const [autoBillingEnabled, setAutoBillingEnabled] = useState(false);
    const [billingDay, setBillingDay] = useState(1);
    const [billingMonthOffset, setBillingMonthOffset] = useState(0);
    const [selectedTaxGroupId, setSelectedTaxGroupId] = useState<string>("");
    const [taxGroups, setTaxGroups] = useState<TaxGroupOption[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<SubscriptionItemWithQuantity | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<string | null>(null);
    const [generatingProforma, setGeneratingProforma] = useState(false);
    const [proformaResult, setProformaResult] = useState<{ 
        success: boolean; 
        pdfUrl?: string; 
        error?: string;
        admCloudCreated?: boolean;
        admCloudError?: string;
        proformaNumber?: string;
    } | null>(null);

    const loadBillingData = useCallback(async () => {
        try {
            setLoading(true);
            const [data, groups] = await Promise.all([
                getSubscriptionBilling(companyId),
                getAdmCloudTaxGroups(),
            ]);
            setTaxGroups(groups);
            if (data) {
                setBilling(data as SubscriptionBillingData);
                setBillingType(data.billingType);
                setAutoBillingEnabled(data.autoBillingEnabled);
                setBillingDay(data.billingDay);
                setBillingMonthOffset(data.billingMonthOffset);
                setSelectedTaxGroupId(data.admCloudTaxGroupId || "");
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

    const handleBillingMonthOffsetChange = async (offset: number) => {
        setBillingMonthOffset(offset);
        setSaving(true);
        try {
            await updateBillingSettings(companyId, billingType, billingDay, undefined, offset);
        } catch (error) {
            console.error("Error updating billing month offset:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleTaxGroupChange = async (taxGroupId: string) => {
        setSelectedTaxGroupId(taxGroupId);
        setSaving(true);
        try {
            await updateBillingTaxGroup(companyId, taxGroupId || null);
        } catch (error) {
            console.error("Error updating tax group:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleAutoBillingChange = async (enabled: boolean) => {
        setAutoBillingEnabled(enabled);
        setSaving(true);
        try {
            await toggleAutoBilling(companyId, enabled);
        } catch (error) {
            console.error("Error updating auto billing:", error);
            setAutoBillingEnabled(!enabled); // Revert on error
        } finally {
            setSaving(false);
        }
    };

    const handleGenerateProforma = async () => {
        setGeneratingProforma(true);
        setProformaResult(null);
        try {
            const response = await fetch("/api/billing/generate-proforma", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ companyId }),
            });
            const data = await response.json();
            
            if (data.success) {
                setProformaResult({ 
                    success: true, 
                    pdfUrl: data.pdfUrl,
                    admCloudCreated: data.admCloudCreated,
                    admCloudError: data.admCloudError,
                    proformaNumber: data.proformaNumber,
                });
            } else {
                setProformaResult({ success: false, error: data.error });
            }
        } catch (error) {
            console.error("Error generating proforma:", error);
            setProformaResult({ success: false, error: "Error al generar la proforma" });
        } finally {
            setGeneratingProforma(false);
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
                <Loader2 className="animate-spin text-nearby-dark dark:text-nearby-dark-300" size={24} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-md font-semibold text-nearby-dark mb-3">
                    Cobro de suscripción
                </h3>
                
                {/* Radio buttons for billing type and manual proforma button */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex items-center space-x-4">
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="radio"
                                    name="billingType"
                                    checked={billingType === "STANDARD"}
                                    onChange={() => handleBillingTypeChange("STANDARD")}
                                    className="w-4 h-4 text-nearby-dark dark:text-nearby-dark-300 border-gray-300 focus:ring-nearby-dark/30"
                                />
                                <span className="ml-2 text-sm font-medium text-dark-slate">Estándar</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="radio"
                                    name="billingType"
                                    checked={billingType === "CUSTOM"}
                                    onChange={() => handleBillingTypeChange("CUSTOM")}
                                    className="w-4 h-4 text-nearby-dark dark:text-nearby-dark-300 border-gray-300 focus:ring-nearby-dark/30"
                                />
                                <span className="ml-2 text-sm font-medium text-dark-slate">Personalizado</span>
                            </label>
                        </div>
                        
                        {/* Manual proforma button */}
                        <div className="flex items-center gap-2 sm:ml-auto">
                            {saving && <Loader2 className="animate-spin text-nearby-dark dark:text-nearby-dark-300" size={16} />}
                            <button
                                type="button"
                                onClick={handleGenerateProforma}
                                disabled={generatingProforma || !billing?.items.length}
                                className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-nearby-dark hover:bg-nearby-dark-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Generar proforma manualmente"
                            >
                                {generatingProforma ? (
                                    <Loader2 className="animate-spin mr-2" size={14} />
                                ) : (
                                    <FileText size={14} className="mr-2" />
                                )}
                                Generar proforma manual
                            </button>
                        </div>
                    </div>

                    {/* Proforma generation result */}
                    {proformaResult && (
                        <div className={`p-3 rounded-lg text-sm space-y-2 ${
                            proformaResult.success 
                                ? proformaResult.admCloudCreated 
                                    ? "bg-green-50 border border-green-200" 
                                    : "bg-amber-50 border border-amber-200"
                                : "bg-red-50 border border-red-200"
                        }`}>
                            {proformaResult.success ? (
                                <>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            {proformaResult.admCloudCreated ? (
                                                <span className="text-green-800 font-medium">
                                                    ✓ Proforma {proformaResult.proformaNumber} creada en ADMCloud
                                                </span>
                                            ) : (
                                                <span className="text-amber-800 font-medium">
                                                    ⚠ PDF generado localmente (no se creó en ADMCloud)
                                                </span>
                                            )}
                                        </div>
                                        <a
                                            href={proformaResult.pdfUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`flex items-center font-medium ${
                                                proformaResult.admCloudCreated 
                                                    ? "text-green-700 hover:text-green-900" 
                                                    : "text-amber-700 hover:text-amber-900"
                                            }`}
                                        >
                                            <Download size={14} className="mr-1" />
                                            Descargar PDF
                                        </a>
                                    </div>
                                    {proformaResult.admCloudError && (
                                        <p className="text-amber-700 text-xs">
                                            Razón: {proformaResult.admCloudError}
                                        </p>
                                    )}
                                </>
                            ) : (
                                <span className="text-red-800">{proformaResult.error}</span>
                            )}
                        </div>
                    )}

                    {/* Standard billing items table */}
                    {billingType === "STANDARD" && (
                        <div className="border border-graphite-gray rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-graphite-gray">
                                <span className="text-sm font-medium text-dark-slate">Artículos de suscripción</span>
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="flex items-center px-2 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-nearby-dark/8 dark:hover:bg-nearby-dark-300/10 rounded-md transition-colors"
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
                                                                ({item.countType === "ACTIVE_PROJECTS" 
                                                                    ? "Proy." 
                                                                    : item.countType === "ACTIVE_USERS" 
                                                                        ? "Usr." 
                                                                        : `${item.calculatedBase === "USERS" ? "Usr" : "Proy"}-${item.calculatedSubtract || 0}`})
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono tabular-nums text-dark-slate">{formatMoney(Number(item.price))}</td>
                                                    <td className="px-4 py-3 text-right font-medium font-mono tabular-nums text-dark-slate">{formatMoney(item.subtotal)}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center justify-end space-x-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEditItem(item)}
                                                                className="p-1 text-gray-400 hover:text-nearby-dark dark:hover:text-nearby-dark-300 rounded transition-colors"
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

            {/* Auto billing toggle, billing day and total */}
            <div className="border-t border-graphite-gray pt-4 space-y-3">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    {/* Auto billing toggle */}
                    <label className="flex items-center cursor-pointer">
                        <div className="relative">
                            <input
                                type="checkbox"
                                checked={autoBillingEnabled}
                                onChange={(e) => handleAutoBillingChange(e.target.checked)}
                                className="sr-only"
                            />
                            <div className={`block w-10 h-6 rounded-full transition-colors ${autoBillingEnabled ? "bg-nearby-dark" : "bg-gray-300"}`}></div>
                            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${autoBillingEnabled ? "translate-x-4" : ""}`}></div>
                        </div>
                        <span className="ml-3 text-sm font-medium text-dark-slate">
                            Cobro automático
                        </span>
                    </label>

                    {autoBillingEnabled && (
                        <>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Día:</label>
                                <select
                                    value={billingDay}
                                    onChange={(e) => handleBillingDayChange(parseInt(e.target.value))}
                                    className="w-16 px-1.5 py-1 text-sm border border-graphite-gray rounded-md focus:ring-2 focus:ring-nearby-dark/15 focus:border-nearby-dark/50"
                                >
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                        <option key={day} value={day}>{day}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Período:</label>
                                <select
                                    value={billingMonthOffset}
                                    onChange={(e) => handleBillingMonthOffsetChange(parseInt(e.target.value))}
                                    className="px-1.5 py-1 text-sm border border-graphite-gray rounded-md focus:ring-2 focus:ring-nearby-dark/15 focus:border-nearby-dark/50"
                                >
                                    <option value={-1}>Mes anterior</option>
                                    <option value={0}>Mes actual</option>
                                    <option value={1}>Mes siguiente</option>
                                </select>
                            </div>
                            {taxGroups.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Impuesto:</label>
                                    <select
                                        value={selectedTaxGroupId}
                                        onChange={(e) => handleTaxGroupChange(e.target.value)}
                                        className="px-1.5 py-1 text-sm border border-graphite-gray rounded-md focus:ring-2 focus:ring-nearby-dark/15 focus:border-nearby-dark/50"
                                    >
                                        <option value="">Sin impuesto</option>
                                        {taxGroups.map((g) => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </>
                    )}

                    <div className="flex items-center gap-2 ml-auto bg-gray-50 px-3 py-1.5 rounded-lg">
                        <span className="text-xs font-medium text-gray-500">Total:</span>
                        <span className="text-base font-bold font-mono tabular-nums text-nearby-dark">
                            {formatMoney(billing?.total || 0)}
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

            {billing?.usageInsights && (
                <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden">
                    <div className="px-5 py-4 border-b border-[var(--card-border)] bg-[linear-gradient(135deg,rgba(252,90,52,0.08),rgba(34,197,94,0.04))]">
                        <h4 className="text-sm font-semibold text-[var(--foreground)]">
                            Movimiento de licencias
                        </h4>
                        <p className="text-xs text-[var(--muted-text)] mt-1">
                            Comparativo entre {billing.usageInsights.previousMonthLabel} y {billing.usageInsights.currentMonthLabel} para explicar la base operativa del cobro recurrente.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-4">
                        <UsageMiniChartCard
                            title="Usuarios"
                            subtitle="Altas e inactivaciones del cliente en los dos meses más recientes."
                            currentActive={billing.activeUsers}
                            series={billing.usageInsights.users}
                            activatedColor="#10b981"
                            deactivatedColor="#fc5a34"
                        />
                        <UsageMiniChartCard
                            title="Proyectos"
                            subtitle="Movimiento de proyectos que impacta el licenciamiento mensual."
                            currentActive={billing.activeProjects}
                            series={billing.usageInsights.projects}
                            activatedColor="#3b82f6"
                            deactivatedColor="#f97316"
                        />
                    </div>
                </div>
            )}

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
                    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
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

function UsageMiniChartCard({
    title,
    subtitle,
    currentActive,
    series,
    activatedColor,
    deactivatedColor,
}: {
    title: string;
    subtitle: string;
    currentActive: number;
    series: Array<{
        key: string;
        label: string;
        activated: number;
        deactivated: number;
        activeAtEnd: number;
    }>;
    activatedColor: string;
    deactivatedColor: string;
}) {
    const maxValue = Math.max(
        1,
        ...series.flatMap((point) => [point.activated, point.deactivated, point.activeAtEnd])
    );

    return (
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-1)] p-4">
            <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                    <h5 className="text-sm font-semibold text-[var(--foreground)]">{title}</h5>
                    <p className="text-xs text-[var(--muted-text)] mt-1 max-w-md">{subtitle}</p>
                </div>
                <div className="shrink-0 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-right shadow-sm">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted-text)]">Activos hoy</p>
                    <p className="text-xl font-bold text-[var(--foreground)]">{currentActive}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                {series.map((point) => (
                    <div key={point.key} className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-3">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted-text)]">{point.label}</p>
                        <div className="mt-2 flex items-center justify-between text-sm">
                            <span className="text-[var(--muted-text)]">Activos al cierre</span>
                            <span className="font-semibold text-[var(--foreground)]">{point.activeAtEnd}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-sm">
                            <span className="text-[var(--muted-text)]">Activados</span>
                            <span className="font-semibold" style={{ color: activatedColor }}>{point.activated}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-sm">
                            <span className="text-[var(--muted-text)]">Inactivados</span>
                            <span className="font-semibold" style={{ color: deactivatedColor }}>{point.deactivated}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="h-48 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-3">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={series} barCategoryGap={18}>
                        <CartesianGrid stroke="rgba(148, 163, 184, 0.16)" vertical={false} />
                        <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: "var(--muted-text)" }}
                        />
                        <YAxis
                            allowDecimals={false}
                            axisLine={false}
                            tickLine={false}
                            domain={[0, maxValue]}
                            tick={{ fontSize: 11, fill: "var(--muted-text)" }}
                            width={26}
                        />
                        <Tooltip
                            cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
                            contentStyle={{
                                borderRadius: 12,
                                border: "1px solid rgba(148,163,184,0.24)",
                                backgroundColor: "rgba(15, 23, 42, 0.96)",
                                color: "#f8fafc",
                            }}
                            formatter={(value: number | string | undefined, name: string | undefined) => {
                                const numericValue = typeof value === "number" ? value : Number(value || 0);
                                if (name === "activated") return [numericValue, "Activados"];
                                if (name === "deactivated") return [numericValue, "Inactivados"];
                                return [numericValue, "Activos al cierre"];
                            }}
                            labelFormatter={(label) => `Mes: ${label}`}
                        />
                        <Bar dataKey="activated" name="activated" radius={[6, 6, 0, 0]} fill={activatedColor} />
                        <Bar dataKey="deactivated" name="deactivated" radius={[6, 6, 0, 0]} fill={deactivatedColor} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
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
    const [calculatedBase, setCalculatedBase] = useState<CalculatedBase>(item?.calculatedBase || "PROJECTS");
    const [calculatedSubtract, setCalculatedSubtract] = useState(item?.calculatedSubtract?.toString() || "0");

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

        if (countType === "CALCULATED" && parseInt(calculatedSubtract) < 0) {
            console.log("[SubscriptionItemModal] Invalid subtract value, showing error");
            setError("El valor a restar debe ser mayor o igual a 0");
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
                calculatedBase: countType === "CALCULATED" ? calculatedBase : undefined,
                calculatedSubtract: countType === "CALCULATED" ? parseInt(calculatedSubtract) || 0 : undefined,
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
            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-[var(--foreground)] mb-4">
                    {item ? "Editar artículo" : "Agregar artículo"}
                </h3>

                {loadingItems ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="animate-spin text-nearby-dark dark:text-nearby-dark-300" size={24} />
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
                                className="w-full px-3 py-2.5 min-h-[44px] text-base sm:text-sm bg-[var(--input-bg)] text-[var(--foreground)] border border-[var(--input-border)] rounded-lg focus:ring-2 focus:ring-nearby-dark/15 focus:border-nearby-dark/50"
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
                                    className="w-full px-3 py-2.5 min-h-[44px] text-base sm:text-sm bg-[var(--input-bg)] text-[var(--foreground)] border border-[var(--input-border)] rounded-lg focus:ring-2 focus:ring-nearby-dark/15 focus:border-nearby-dark/50"
                                    required
                                >
                                    {selectedItem.prices.map((priceOption) => (
                                        <option key={priceOption.priceListId} value={priceOption.priceListId}>
                                            {priceOption.priceListName} - {formatMoney(priceOption.price)} {priceOption.currency}
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
                                        {formatMoney(selectedPrice.price)} <span className="text-[var(--muted-text)] font-normal">{selectedPrice.currency}</span>
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
                                className="w-full px-3 py-2.5 min-h-[44px] text-base sm:text-sm bg-[var(--input-bg)] text-[var(--foreground)] border border-[var(--input-border)] rounded-lg focus:ring-2 focus:ring-nearby-dark/15 focus:border-nearby-dark/50"
                            >
                                <option value="MANUAL">Manual</option>
                                <option value="ACTIVE_PROJECTS">Proyectos activos</option>
                                <option value="ACTIVE_USERS">Usuarios activos</option>
                                <option value="CALCULATED">Calculado (base - valor)</option>
                            </select>
                        </div>

                        {/* Calculated type fields */}
                        {countType === "CALCULATED" && (
                            <div className="space-y-4 p-4 bg-[var(--hover-bg)] rounded-lg border border-[var(--card-border)]">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                                        Base de cálculo
                                    </label>
                                    <select
                                        value={calculatedBase}
                                        onChange={(e) => setCalculatedBase(e.target.value as CalculatedBase)}
                                        className="w-full px-3 py-2.5 min-h-[44px] text-base sm:text-sm bg-[var(--input-bg)] text-[var(--foreground)] border border-[var(--input-border)] rounded-lg focus:ring-2 focus:ring-nearby-dark/15 focus:border-nearby-dark/50"
                                    >
                                        <option value="PROJECTS">Proyectos activos</option>
                                        <option value="USERS">Usuarios activos</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                                        Restar valor
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={calculatedSubtract}
                                        onChange={(e) => setCalculatedSubtract(e.target.value)}
                                        placeholder="Ej: 5"
                                        className="w-full px-3 py-2.5 min-h-[44px] text-base sm:text-sm bg-[var(--input-bg)] text-[var(--foreground)] placeholder:text-[var(--muted-text)] border border-[var(--input-border)] rounded-lg focus:ring-2 focus:ring-nearby-dark/15 focus:border-nearby-dark/50"
                                    />
                                </div>
                                <p className="text-xs text-[var(--muted-text)]">
                                    Fórmula: ({calculatedBase === "USERS" ? "Usuarios activos" : "Proyectos activos"}) - {calculatedSubtract || 0} = Cantidad
                                </p>
                            </div>
                        )}

                        {/* Quantity (for MANUAL only) */}
                        {countType === "MANUAL" && (
                            <div>
                                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                                    Cantidad
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    value={manualQuantity}
                                    onChange={(e) => setManualQuantity(e.target.value)}
                                    placeholder="Ingrese la cantidad"
                                    className="w-full px-3 py-2.5 min-h-[44px] text-base sm:text-sm bg-[var(--input-bg)] text-[var(--foreground)] placeholder:text-[var(--muted-text)] border border-[var(--input-border)] rounded-lg focus:ring-2 focus:ring-nearby-dark/15 focus:border-nearby-dark/50"
                                />
                            </div>
                        )}

                        {/* Info for automatic count types */}
                        {(countType === "ACTIVE_PROJECTS" || countType === "ACTIVE_USERS") && (
                            <div className="p-3 bg-[var(--hover-bg)] rounded-lg border border-[var(--card-border)]">
                                <p className="text-xs text-[var(--muted-text)]">
                                    {countType === "ACTIVE_PROJECTS" 
                                        ? "Se totalizarán los proyectos con estado \"Activo\""
                                        : "Se totalizarán los usuarios con estado \"Activo\""
                                    }
                                </p>
                            </div>
                        )}

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
