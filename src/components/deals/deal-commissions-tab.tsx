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
    commissionableBase: number
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
            ? (commissionableBase * toNumber(entry.percentage)) / 100
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
    const commissionableBase = toNumber(commission?.commissionableBase ?? approvedQuote.totalOneTime);
    const marginRate = toNumber(commission?.marginRate ?? 100);
    const totalDealBase = toNumber(approvedQuote.totalOneTime) + toNumber(approvedQuote.totalMonthly);
    const [entries, setEntries] = useState<CommissionEntryState[]>(() => buildInitialEntries(commission, commissionableBase));
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
                    ? Number(((commissionableBase * percentageValue) / 100).toFixed(2))
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
        const element = document.getElementById(`deal-commission-pdf-${dealId}`);
        if (!element) return;

        try {
            setPdfOpen(true);
            await new Promise((resolve) => setTimeout(resolve, 40));

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

    return (
        <>
            <div className="space-y-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center rounded-full border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-1 text-xs font-medium text-[var(--muted-text)]">
                                Cotización aprobada: <span className="ml-1 font-semibold text-[var(--foreground)]">{quoteCode}</span>
                            </span>
                            <span className="inline-flex items-center rounded-full border border-nearby-dark/20 bg-nearby-dark/5 px-3 py-1 text-xs font-medium text-nearby-dark dark:text-nearby-dark-300">
                                Margen aplicado: {formatPercent(marginRate)}
                            </span>
                        </div>
                        <p className="mt-3 text-sm text-[var(--muted-text)]">
                            La base comisionable quedó congelada al aprobar la cotización y se calcula solo sobre el monto de pago único.
                        </p>
                    </div>
                    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3 text-sm shadow-sm">
                        <div className="flex items-center justify-between gap-5">
                            <span className="text-[var(--muted-text)]">Negocio</span>
                            <span className="font-semibold text-[var(--foreground)]">{dealCode}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-5">
                            <span className="text-[var(--muted-text)]">Cliente</span>
                            <span className="max-w-[220px] truncate text-right font-semibold text-[var(--foreground)]">{companyName || "—"}</span>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm">
                        <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-text)]">Monto del negocio</p>
                        <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">{formatCurrency(totalDealBase, currency)}</p>
                    </div>
                    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm">
                        <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-text)]">Base comisionable</p>
                        <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">{formatCurrency(commissionableBase, currency)}</p>
                    </div>
                    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm">
                        <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-text)]">Comisiones cargadas</p>
                        <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">{formatCurrency(totalAssigned, currency)}</p>
                    </div>
                    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm">
                        <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-text)]">Disponible restante</p>
                        <p className={`mt-2 text-2xl font-bold ${remaining < 0 ? "text-red-600" : "text-[var(--foreground)]"}`}>
                            {formatCurrency(remaining, currency)}
                        </p>
                    </div>
                </div>

                {message && (
                    <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
                        {message}
                    </div>
                )}
                {error && (
                    <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
                        {error}
                    </div>
                )}
                {warning && (
                    <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {warning}
                    </div>
                )}

                <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm overflow-hidden">
                    <div className="flex flex-col gap-3 border-b border-[var(--card-border)] px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-[var(--foreground)]">Desglose de comisiones</h3>
                            <p className="text-sm text-[var(--muted-text)] mt-1">Asigna múltiples personas y combina porcentajes con montos fijos dentro de la misma liquidación.</p>
                        </div>
                        <button
                            type="button"
                            onClick={addEntry}
                            className="inline-flex items-center justify-center rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--hover-bg)]"
                        >
                            <Plus size={16} className="mr-2" />
                            Agregar
                        </button>
                    </div>

                    <div className="space-y-4 p-4">
                        {entries.map((entry, index) => (
                            <div key={`${index}-${entry.userId}`} className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4">
                                <div className="grid gap-4 lg:grid-cols-12">
                                    <div className="lg:col-span-3">
                                        <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Persona</label>
                                        <select
                                            value={entry.userId}
                                            onChange={(event) => updateEntry(index, { userId: event.target.value })}
                                            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2.5 text-sm"
                                        >
                                            <option value="">Seleccionar usuario</option>
                                            {users.map((user) => (
                                                <option key={user.id} value={user.id}>
                                                    {user.name || user.email}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="lg:col-span-2">
                                        <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Rol</label>
                                        <select
                                            value={entry.role}
                                            onChange={(event) => updateEntry(index, { role: event.target.value as CommissionRole })}
                                            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2.5 text-sm"
                                        >
                                            {Object.entries(ROLE_LABELS).map(([value, label]) => (
                                                <option key={value} value={value}>{label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="lg:col-span-2">
                                        <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Tipo</label>
                                        <select
                                            value={entry.type}
                                            onChange={(event) => updateEntry(index, { type: event.target.value as CommissionValueType })}
                                            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2.5 text-sm"
                                        >
                                            <option value={CommissionValueType.PERCENTAGE}>Porcentaje</option>
                                            <option value={CommissionValueType.FIXED_AMOUNT}>Monto fijo</option>
                                        </select>
                                    </div>
                                    <div className="lg:col-span-2">
                                        <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                                            {entry.type === CommissionValueType.PERCENTAGE ? "Valor (%)" : "Monto fijo"}
                                        </label>
                                        {entry.type === CommissionValueType.PERCENTAGE ? (
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.01"
                                                value={entry.percentage}
                                                onChange={(event) => updateEntry(index, { percentage: event.target.value })}
                                                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2.5 text-sm"
                                            />
                                        ) : (
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={entry.fixedAmount}
                                                onChange={(event) => updateEntry(index, { fixedAmount: event.target.value })}
                                                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2.5 text-sm"
                                            />
                                        )}
                                    </div>
                                    <div className="lg:col-span-2">
                                        <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Monto a pagar</label>
                                        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-sm">
                                            {formatCurrency(Number(entry.calculatedAmount || 0), currency)}
                                        </div>
                                    </div>
                                    <div className="lg:col-span-1 flex items-end">
                                        <button
                                            type="button"
                                            onClick={() => removeEntry(index)}
                                            disabled={entries.length === 1}
                                            className="inline-flex h-[42px] w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Observaciones</label>
                    <textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        rows={4}
                        placeholder="Notas internas sobre criterios de reparto, acuerdos o validaciones."
                        className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3 text-sm"
                    />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-[var(--muted-text)]">
                        {totalAssigned > commissionableBase
                            ? "La suma de las comisiones supera la base disponible. Se permite guardar, pero quedará señalada."
                            : "La base disponible para comisión permanece congelada desde la aprobación de la cotización."}
                    </div>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row">
                        <button
                            type="button"
                            onClick={generatePDF}
                            className="inline-flex items-center justify-center rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                        >
                            <Download size={16} className="mr-2" />
                            Generar PDF
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="inline-flex items-center justify-center rounded-lg bg-nearby-dark px-4 py-2.5 text-sm font-medium text-white hover:bg-nearby-dark-600 disabled:opacity-60"
                        >
                            <Save size={16} className="mr-2" />
                            {saving ? "Guardando..." : "Guardar comisiones"}
                        </button>
                    </div>
                </div>
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
                    <div style={{ marginTop: "4px", fontSize: "7.2pt", color: muted }}>Margen aplicado: {formatPercent(marginRate)}</div>
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
