"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Download, Plus, Save, Trash2 } from "lucide-react";
import { CommissionRole, CommissionValueType } from "@prisma/client";
import { saveDealCommission } from "@/actions/deal-commissions";
import { formatDealNumber, formatQuoteNumber } from "@/lib/deal-number";

type WorkspaceUserOption = {
    id: string;
    name: string | null;
    email: string;
    photoUrl?: string | null;
};

type CommissionEntryState = {
    userId: string;
    role: CommissionRole;
    type: CommissionValueType;
    percentage: string;
    fixedAmount: string;
    calculatedAmount: number;
};

interface DealCommissionsTabProps {
    dealId: string;
    dealNumber: number;
    companyName?: string | null;
    approvedQuote: {
        id: string;
        number: number;
        currency: "USD" | "DOP";
        totalOneTime: unknown;
        totalMonthly: unknown;
    };
    commission?: {
        id: string;
        marginRate: unknown;
        commissionableBase: unknown;
        notes?: string | null;
        entries: Array<{
            id: string;
            role: CommissionRole;
            type: CommissionValueType;
            percentage?: unknown;
            fixedAmount?: unknown;
            calculatedAmount: unknown;
            user: WorkspaceUserOption;
        }>;
    } | null;
    users: WorkspaceUserOption[];
    workspace?: {
        legalName?: string | null;
        rnc?: string | null;
        address?: string | null;
        phone?: string | null;
        logoUrl?: string | null;
    };
    currentUserName?: string | null;
}

const ROLE_LABELS: Record<CommissionRole, string> = {
    MARKETING: "Marketing",
    COMERCIAL: "Comercial",
    TECNICO: "Técnico",
    FUNCIONAL: "Funcional",
    ADMINISTRATIVO: "Administrativo",
};

const TYPE_LABELS: Record<CommissionValueType, string> = {
    PERCENTAGE: "Porcentaje",
    FIXED_AMOUNT: "Monto fijo",
};

function formatPercent(value: number) {
    return `${value.toLocaleString("es-DO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
}

function formatCurrency(value: number, currency: "USD" | "DOP") {
    return new Intl.NumberFormat("es-DO", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

function toNumber(value: unknown) {
    return Number(value || 0);
}

function buildInitialEntries(
    commission: DealCommissionsTabProps["commission"],
    oneTimeBase: number
): CommissionEntryState[] {
    if (!commission?.entries?.length) {
        return [{
            userId: "",
            role: CommissionRole.COMERCIAL,
            type: CommissionValueType.PERCENTAGE,
            percentage: "",
            fixedAmount: "",
            calculatedAmount: 0,
        }];
    }

    return commission.entries.map((entry) => {
        const type = entry.type;
        const percentage = type === CommissionValueType.PERCENTAGE ? String(toNumber(entry.percentage) || "") : "";
        const fixedAmount = type === CommissionValueType.FIXED_AMOUNT ? String(toNumber(entry.fixedAmount) || "") : "";
        const calculatedAmount = type === CommissionValueType.PERCENTAGE
            ? (oneTimeBase * toNumber(entry.percentage)) / 100
            : toNumber(entry.calculatedAmount);

        return {
            userId: entry.user.id,
            role: entry.role,
            type,
            percentage,
            fixedAmount,
            calculatedAmount,
        };
    });
}

export function DealCommissionsTab({
    dealId,
    dealNumber,
    companyName,
    approvedQuote,
    commission,
    users,
    workspace,
    currentUserName,
}: DealCommissionsTabProps) {
    const totalDealBase = toNumber(approvedQuote.totalOneTime) + toNumber(approvedQuote.totalMonthly);
    const oneTimeBase = toNumber(approvedQuote.totalOneTime);
    const marginRate = toNumber(commission?.marginRate ?? 100);
    const commissionableBase = Number(((oneTimeBase * marginRate) / 100).toFixed(2));
    const [entries, setEntries] = useState<CommissionEntryState[]>(() => buildInitialEntries(commission, oneTimeBase));
    const [notes, setNotes] = useState(commission?.notes || "");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);
    const [pdfOpen, setPdfOpen] = useState(false);

    const currency = approvedQuote.currency;
    const quoteCode = formatQuoteNumber(dealNumber, approvedQuote.number);
    const dealCode = formatDealNumber(dealNumber);

    const totalAssigned = useMemo(
        () => entries.reduce((sum, entry) => sum + Number(entry.calculatedAmount || 0), 0),
        [entries]
    );

    const remaining = commissionableBase - totalAssigned;

    const updateEntry = (index: number, patch: Partial<CommissionEntryState>) => {
        setEntries((prev) => prev.map((entry, entryIndex) => {
            if (entryIndex !== index) return entry;

            const next = { ...entry, ...patch };
            if (next.type === CommissionValueType.PERCENTAGE) {
                const percentageValue = Number(next.percentage || 0);
                next.fixedAmount = "";
                next.calculatedAmount = Number.isFinite(percentageValue)
                    ? Number(((oneTimeBase * percentageValue) / 100).toFixed(2))
                    : 0;
            } else {
                const fixedValue = Number(next.fixedAmount || 0);
                next.percentage = "";
                next.calculatedAmount = Number.isFinite(fixedValue) ? Number(fixedValue.toFixed(2)) : 0;
            }

            return next;
        }));
    };

    const addEntry = () => {
        setEntries((prev) => [
            ...prev,
            {
                userId: "",
                role: CommissionRole.COMERCIAL,
                type: CommissionValueType.PERCENTAGE,
                percentage: "",
                fixedAmount: "",
                calculatedAmount: 0,
            },
        ]);
    };

    const removeEntry = (index: number) => {
        setEntries((prev) => prev.filter((_, entryIndex) => entryIndex !== index));
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        setError(null);
        setWarning(null);

        const payload = {
            dealId,
            notes,
            entries: entries.map((entry) => ({
                userId: entry.userId,
                role: entry.role,
                type: entry.type,
                percentage: entry.type === CommissionValueType.PERCENTAGE ? Number(entry.percentage || 0) : null,
                fixedAmount: entry.type === CommissionValueType.FIXED_AMOUNT ? Number(entry.fixedAmount || 0) : null,
                calculatedAmount: Number(entry.calculatedAmount || 0),
            })),
        };

        const result = await saveDealCommission(payload);
        if (!result.success) {
            setError(result.message || "No se pudieron guardar las comisiones.");
            setSaving(false);
            return;
        }

        setMessage("Comisiones guardadas correctamente.");
        setWarning(result.warning || null);
        setSaving(false);
    };

    const generatePDF = async () => {
        try {
            setPdfOpen(true);
            // Wait for React to commit the portal and the DOM to paint
            await new Promise<void>((resolve) => {
                requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 100)));
            });

            const element = document.getElementById(`deal-commission-pdf-${dealId}`);
            if (!element) {
                setError("No se pudo preparar la plantilla del PDF.");
                setPdfOpen(false);
                return;
            }

            const originalLeft = element.style.left;
            const originalTop = element.style.top;
            element.style.left = "0";
            element.style.top = "0";

            const canvas = await html2canvas(element, {
                scale: 3,
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff",
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight,
            });

            element.style.left = originalLeft;
            element.style.top = originalTop;

            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
            });

            const imgWidth = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            const pageHeight = 297;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            const safeClient = (companyName || "Cliente").replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
            pdf.save(`Comisiones ${safeClient} ${dealCode}.pdf`);
        } finally {
            setPdfOpen(false);
        }
    };

    const pdf = pdfOpen ? (
        <CommissionPDFTemplate
            id={`deal-commission-pdf-${dealId}`}
            workspace={workspace}
            companyName={companyName}
            dealCode={dealCode}
            quoteCode={quoteCode}
            totalDealBase={totalDealBase}
            commissionableBase={commissionableBase}
            marginRate={marginRate}
            entries={entries}
            users={users}
            notes={notes}
            currency={currency}
            preparedBy={currentUserName || "Usuario actual"}
        />
    ) : null;

    const pct = commissionableBase > 0 ? Math.min(100, (totalAssigned / commissionableBase) * 100) : 0;
    const over = remaining < 0;
    const barColor = over ? "bg-red-500" : pct > 85 ? "bg-amber-500" : "bg-success-green";

    return (
        <>
            <div className="space-y-4">
                {message && (
                    <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950/30 dark:text-green-300">{message}</div>
                )}
                {error && (
                    <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-300">{error}</div>
                )}
                {warning && (
                    <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">{warning}</div>
                )}

                <section className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm">
                    {/* Header */}
                    <header className="flex flex-col gap-4 px-6 pt-6 pb-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">Liquidación de comisiones</h2>
                            <p className="mt-1 text-sm text-[var(--muted-text)]">
                                {companyName || "Cliente"} · {dealCode} · Cotización {quoteCode}
                            </p>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2 text-xs">
                            <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2.5 py-1 font-medium text-[var(--muted-text)]">
                                Margen {formatPercent(marginRate)}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-nearby-dark/8 px-2.5 py-1 font-medium text-nearby-dark dark:text-nearby-dark-300">
                                Base congelada
                            </span>
                        </div>
                    </header>

                    {/* Stat strip */}
                    <div className="border-y border-[var(--card-border)] bg-[var(--surface-2)]/40 px-6 py-5">
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:divide-x sm:divide-[var(--card-border)]">
                            <div className="sm:pr-6">
                                <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--muted-text)]">Monto del negocio</p>
                                <p className="mt-1.5 text-xl font-semibold tabular-nums text-[var(--foreground)]">{formatCurrency(totalDealBase, currency)}</p>
                            </div>
                            <div className="sm:px-6">
                                <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--muted-text)]">Base comisionable</p>
                                <p className="mt-1.5 text-xl font-semibold tabular-nums text-[var(--foreground)]">{formatCurrency(commissionableBase, currency)}</p>
                            </div>
                            <div className="sm:pl-6">
                                <div className="flex items-baseline justify-between gap-2">
                                    <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--muted-text)]">Disponible restante</p>
                                    <span className="text-[10.5px] font-semibold tabular-nums text-[var(--muted-text)]">{pct.toFixed(0)}%</span>
                                </div>
                                <p className={`mt-1.5 text-xl font-semibold tabular-nums ${over ? "text-red-600" : "text-[var(--foreground)]"}`}>
                                    {formatCurrency(remaining, currency)}
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
                            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                    </div>

                    {/* Entries */}
                    <div className="px-6 pt-6 pb-2">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">Desglose</h3>
                            <button
                                type="button"
                                onClick={addEntry}
                                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-nearby-dark hover:bg-nearby-dark/8 dark:text-nearby-dark-300"
                            >
                                <Plus size={14} />
                                Agregar persona
                            </button>
                        </div>
                    </div>

                    {/* Desktop table */}
                    <div className="hidden lg:block">
                        <div className="grid grid-cols-[minmax(0,2.4fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1.4fr)_36px] items-center gap-4 px-6 pb-2 text-[10.5px] font-medium uppercase tracking-[0.1em] text-[var(--muted-text)]">
                            <div>Persona</div>
                            <div>Rol</div>
                            <div>Tipo</div>
                            <div>Valor</div>
                            <div className="text-right">Monto a pagar</div>
                            <div />
                        </div>
                        <div>
                            {entries.map((entry, index) => {
                                const user = users.find((u) => u.id === entry.userId);
                                const initials = (user?.name || user?.email || "?").trim().substring(0, 1).toUpperCase();
                                return (
                                    <div
                                        key={`${index}-${entry.userId}`}
                                        className="group grid grid-cols-[minmax(0,2.4fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1.4fr)_36px] items-center gap-4 border-t border-[var(--card-border)] px-6 py-3 transition-colors hover:bg-[var(--surface-2)]/30"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-nearby-dark/15 to-nearby-dark/5 text-xs font-semibold text-nearby-dark">
                                                {user?.photoUrl ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={user.photoUrl} alt="" className="h-full w-full object-cover" />
                                                ) : initials}
                                            </div>
                                            <select
                                                value={entry.userId}
                                                onChange={(event) => updateEntry(index, { userId: event.target.value })}
                                                className="w-full min-w-0 cursor-pointer appearance-none bg-transparent py-1 text-sm font-medium text-[var(--foreground)] outline-none focus:text-nearby-dark"
                                            >
                                                <option value="">Seleccionar usuario</option>
                                                {users.map((u) => (
                                                    <option key={u.id} value={u.id}>{u.name || u.email}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <select
                                            value={entry.role}
                                            onChange={(event) => updateEntry(index, { role: event.target.value as CommissionRole })}
                                            className="w-full cursor-pointer appearance-none bg-transparent py-1 text-sm text-[var(--foreground)] outline-none focus:text-nearby-dark"
                                        >
                                            {Object.entries(ROLE_LABELS).map(([value, label]) => (
                                                <option key={value} value={value}>{label}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={entry.type}
                                            onChange={(event) => updateEntry(index, { type: event.target.value as CommissionValueType })}
                                            className="w-full cursor-pointer appearance-none bg-transparent py-1 text-sm text-[var(--foreground)] outline-none focus:text-nearby-dark"
                                        >
                                            <option value={CommissionValueType.PERCENTAGE}>Porcentaje</option>
                                            <option value={CommissionValueType.FIXED_AMOUNT}>Monto fijo</option>
                                        </select>
                                        <div className="relative">
                                            {entry.type === CommissionValueType.PERCENTAGE ? (
                                                <>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        step="0.01"
                                                        value={entry.percentage}
                                                        onChange={(event) => updateEntry(index, { percentage: event.target.value })}
                                                        placeholder="0"
                                                        className="w-full border-0 border-b border-transparent bg-transparent py-1 pl-0 pr-6 text-sm tabular-nums text-[var(--foreground)] outline-none transition-colors hover:border-[var(--card-border)] focus:border-nearby-dark"
                                                    />
                                                    <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-text)]">%</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-text)]">{currency === "USD" ? "$" : "RD$"}</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={entry.fixedAmount}
                                                        onChange={(event) => updateEntry(index, { fixedAmount: event.target.value })}
                                                        placeholder="0.00"
                                                        className={`w-full border-0 border-b border-transparent bg-transparent py-1 pr-0 text-sm tabular-nums text-[var(--foreground)] outline-none transition-colors hover:border-[var(--card-border)] focus:border-nearby-dark ${currency === "USD" ? "pl-4" : "pl-9"}`}
                                                    />
                                                </>
                                            )}
                                        </div>
                                        <div className="text-right text-sm font-semibold tabular-nums text-[var(--foreground)]">
                                            {formatCurrency(Number(entry.calculatedAmount || 0), currency)}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeEntry(index)}
                                            disabled={entries.length === 1}
                                            aria-label="Eliminar"
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted-text)] opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 disabled:opacity-0 dark:hover:bg-red-950/30"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Mobile list */}
                    <div className="space-y-4 px-6 pb-4 lg:hidden">
                        {entries.map((entry, index) => {
                            const user = users.find((u) => u.id === entry.userId);
                            const initials = (user?.name || user?.email || "?").trim().substring(0, 1).toUpperCase();
                            return (
                                <div key={`${index}-${entry.userId}`} className="border-t border-[var(--card-border)] pt-4 first:border-t-0 first:pt-0">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-nearby-dark/15 to-nearby-dark/5 text-xs font-semibold text-nearby-dark">
                                                {user?.photoUrl ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={user.photoUrl} alt="" className="h-full w-full object-cover" />
                                                ) : initials}
                                            </div>
                                            <select
                                                value={entry.userId}
                                                onChange={(event) => updateEntry(index, { userId: event.target.value })}
                                                className="w-full min-w-0 bg-transparent text-sm font-medium text-[var(--foreground)] outline-none"
                                            >
                                                <option value="">Seleccionar usuario</option>
                                                {users.map((u) => (
                                                    <option key={u.id} value={u.id}>{u.name || u.email}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeEntry(index)}
                                            disabled={entries.length === 1}
                                            className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-[var(--muted-text)] hover:text-red-600 disabled:opacity-30"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                        <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-1">
                                            <span className="text-xs text-[var(--muted-text)]">Rol</span>
                                            <select
                                                value={entry.role}
                                                onChange={(event) => updateEntry(index, { role: event.target.value as CommissionRole })}
                                                className="bg-transparent text-right text-sm text-[var(--foreground)] outline-none"
                                            >
                                                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                                                    <option key={value} value={value}>{label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-1">
                                            <span className="text-xs text-[var(--muted-text)]">Tipo</span>
                                            <select
                                                value={entry.type}
                                                onChange={(event) => updateEntry(index, { type: event.target.value as CommissionValueType })}
                                                className="bg-transparent text-right text-sm text-[var(--foreground)] outline-none"
                                            >
                                                <option value={CommissionValueType.PERCENTAGE}>Porcentaje</option>
                                                <option value={CommissionValueType.FIXED_AMOUNT}>Monto fijo</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-1">
                                            <span className="text-xs text-[var(--muted-text)]">{entry.type === CommissionValueType.PERCENTAGE ? "Valor" : "Monto"}</span>
                                            {entry.type === CommissionValueType.PERCENTAGE ? (
                                                <div className="flex items-baseline gap-0.5">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        step="0.01"
                                                        value={entry.percentage}
                                                        onChange={(event) => updateEntry(index, { percentage: event.target.value })}
                                                        placeholder="0"
                                                        className="w-12 bg-transparent text-right text-sm tabular-nums text-[var(--foreground)] outline-none"
                                                    />
                                                    <span className="text-xs text-[var(--muted-text)]">%</span>
                                                </div>
                                            ) : (
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={entry.fixedAmount}
                                                    onChange={(event) => updateEntry(index, { fixedAmount: event.target.value })}
                                                    placeholder="0.00"
                                                    className="w-24 bg-transparent text-right text-sm tabular-nums text-[var(--foreground)] outline-none"
                                                />
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-1">
                                            <span className="text-xs text-[var(--muted-text)]">A pagar</span>
                                            <span className="text-sm font-semibold tabular-nums text-[var(--foreground)]">
                                                {formatCurrency(Number(entry.calculatedAmount || 0), currency)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Notes */}
                    <div className="border-t border-[var(--card-border)] px-6 py-5">
                        <label className="block text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--muted-text)] mb-2">Observaciones</label>
                        <textarea
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            rows={10}
                            placeholder="Notas internas sobre criterios de reparto, acuerdos o validaciones."
                            className="w-full resize-none border-0 bg-transparent p-0 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-text)] focus:outline-none focus:ring-0"
                        />
                    </div>

                    {/* Footer */}
                    <footer className="flex flex-col gap-3 border-t border-[var(--card-border)] bg-[var(--surface-2)]/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className={`text-xs ${over ? "text-red-600" : "text-[var(--muted-text)]"}`}>
                            {over
                                ? "La suma supera la base disponible. Se permite guardar."
                                : "Base congelada desde la aprobación de la cotización."}
                        </p>
                        <div className="flex flex-col-reverse gap-2 sm:flex-row">
                            <button
                                type="button"
                                onClick={generatePDF}
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-2)]"
                            >
                                <Download size={15} />
                                PDF
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={saving}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-nearby-dark px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-nearby-dark-600 disabled:opacity-60"
                            >
                                <Save size={15} />
                                {saving ? "Guardando..." : "Guardar"}
                            </button>
                        </div>
                    </footer>
                </section>
            </div>

            {pdf ? createPortal(pdf, document.body) : null}
        </>
    );
}


function CommissionPDFTemplate({
    id,
    workspace,
    companyName,
    dealCode,
    quoteCode,
    totalDealBase,
    commissionableBase,
    marginRate,
    entries,
    users,
    notes,
    currency,
    preparedBy,
}: {
    id: string;
    workspace?: DealCommissionsTabProps["workspace"];
    companyName?: string | null;
    dealCode: string;
    quoteCode: string;
    totalDealBase: number;
    commissionableBase: number;
    marginRate: number;
    entries: CommissionEntryState[];
    users: WorkspaceUserOption[];
    notes: string;
    currency: "USD" | "DOP";
    preparedBy: string;
}) {
    const line = "#d7e1e7";
    const ink = "#17212f";
    const muted = "#667085";

    return (
        <div
            id={id}
            style={{
                width: "210mm",
                minHeight: "297mm",
                padding: "12mm 10mm",
                backgroundColor: "#ffffff",
                fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
                color: ink,
                position: "absolute",
                left: "-9999px",
                top: "0",
                fontSize: "8.5pt",
                lineHeight: "1.45",
                WebkitFontSmoothing: "antialiased",
                MozOsxFontSmoothing: "grayscale",
                textRendering: "geometricPrecision",
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10mm", marginBottom: "8mm" }}>
                <div style={{ width: "45%" }}>
                    {workspace?.logoUrl ? (
                        <img src={workspace.logoUrl} alt="Logo" style={{ maxHeight: "52px", maxWidth: "190px", objectFit: "contain" }} />
                    ) : (
                        <div style={{ fontSize: "11pt", fontWeight: 800 }}>{workspace?.legalName || "NEARBY CRM"}</div>
                    )}
                </div>
                <div style={{ width: "55%", textAlign: "right", fontSize: "8pt", color: muted }}>
                    <div style={{ fontWeight: 800, color: ink }}>{workspace?.legalName || "NEARBY CRM"}</div>
                    {workspace?.rnc && <div>RNC: {workspace.rnc}</div>}
                    {workspace?.address && <div>{workspace.address}</div>}
                    <div>República Dominicana{workspace?.phone ? ` · Tel: ${workspace.phone}` : ""}</div>
                </div>
            </div>

            <div style={{ height: "12px", backgroundColor: "#c9d9de", margin: "10px 0 12px" }} />

            <div style={{ marginBottom: "10px" }}>
                <div style={{ fontSize: "14pt", fontWeight: 800, marginBottom: "4px" }}>Liquidación de Comisiones</div>
                <div style={{ color: muted }}>
                    Cliente: <span style={{ color: ink, fontWeight: 700 }}>{companyName || "—"}</span>
                    {" · "}Negocio: <span style={{ color: ink, fontWeight: 700 }}>{dealCode}</span>
                    {" · "}Cotización aprobada: <span style={{ color: ink, fontWeight: 700 }}>{quoteCode}</span>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                <div style={{ border: `1px solid ${line}`, borderRadius: "8px", padding: "10px" }}>
                    <div style={{ textTransform: "uppercase", letterSpacing: "0.12em", fontSize: "6.8pt", color: muted, marginBottom: "6px" }}>Monto del negocio</div>
                    <div style={{ fontSize: "12pt", fontWeight: 800 }}>{formatCurrency(totalDealBase, currency)}</div>
                </div>
                <div style={{ border: `1px solid ${line}`, borderRadius: "8px", padding: "10px" }}>
                    <div style={{ textTransform: "uppercase", letterSpacing: "0.12em", fontSize: "6.8pt", color: muted, marginBottom: "6px" }}>Monto disponible para comisión</div>
                    <div style={{ fontSize: "12pt", fontWeight: 800 }}>{formatCurrency(commissionableBase, currency)}</div>
                    <div style={{ marginTop: "4px", fontSize: "7.2pt", color: muted }}>
                        Ganancia reservada: {formatPercent(100 - marginRate)} ({formatCurrency(
                            marginRate > 0
                                ? Number(((commissionableBase * (100 - marginRate)) / marginRate).toFixed(2))
                                : 0,
                            currency
                        )})
                    </div>
                </div>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8pt", marginBottom: "12px" }}>
                <thead>
                    <tr style={{ backgroundColor: "#f6f8fa", color: muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        <th style={{ padding: "8px 10px", textAlign: "left", border: `1px solid ${line}` }}>Persona</th>
                        <th style={{ padding: "8px 10px", textAlign: "left", border: `1px solid ${line}` }}>Rol</th>
                        <th style={{ padding: "8px 10px", textAlign: "left", border: `1px solid ${line}` }}>Tipo</th>
                        <th style={{ padding: "8px 10px", textAlign: "right", border: `1px solid ${line}` }}>Valor</th>
                        <th style={{ padding: "8px 10px", textAlign: "right", border: `1px solid ${line}` }}>Monto a pagar</th>
                    </tr>
                </thead>
                <tbody>
                    {entries.map((entry, index) => {
                        const user = users.find((candidate) => candidate.id === entry.userId);
                        const valueLabel = entry.type === CommissionValueType.PERCENTAGE
                            ? `${Number(entry.percentage || 0).toLocaleString("es-DO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`
                            : formatCurrency(Number(entry.fixedAmount || 0), currency);

                        return (
                            <tr key={`${entry.userId}-${index}`}>
                                <td style={{ padding: "9px 10px", border: `1px solid ${line}` }}>{user?.name || user?.email || "—"}</td>
                                <td style={{ padding: "9px 10px", border: `1px solid ${line}` }}>{ROLE_LABELS[entry.role]}</td>
                                <td style={{ padding: "9px 10px", border: `1px solid ${line}` }}>{TYPE_LABELS[entry.type]}</td>
                                <td style={{ padding: "9px 10px", border: `1px solid ${line}`, textAlign: "right" }}>{valueLabel}</td>
                                <td style={{ padding: "9px 10px", border: `1px solid ${line}`, textAlign: "right", fontWeight: 800 }}>
                                    {formatCurrency(Number(entry.calculatedAmount || 0), currency)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "9pt", fontWeight: 700, marginBottom: "4px" }}>Observaciones</div>
                <div style={{ border: `1px solid ${line}`, borderRadius: "8px", padding: "10px", minHeight: "55px", whiteSpace: "pre-wrap" }}>
                    {notes || "—"}
                </div>
            </div>

            <div style={{ borderTop: `1px solid ${line}`, paddingTop: "10px", fontSize: "8.2pt" }}>
                <div>
                    <span style={{ fontWeight: 700 }}>Elaborado / Aprobado por:</span> {preparedBy}
                </div>
            </div>
        </div>
    );
}
