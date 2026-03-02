"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    FileSpreadsheet,
    Search,
    Download,
    Loader2,
    Filter,
    Users,
    X,
    ChevronDown,
    ChevronRight,
    AlertCircle,
} from "lucide-react";
import * as XLSX from "xlsx";

interface ReportLine {
    clientName: string;
    clientId: string;
    itemDescription: string;
    itemCode: string;
    quantity: number;
    unitPrice: number;
    exchangeRate: number;
    discountPercent: number;
    documentNumber: string;
    documentType: "proforma" | "credit_invoice";
    documentDate: string;
    extendedPrice: number;
}

interface AvailableItem {
    id: string;
    code: string;
    name: string;
}

interface Props {
    availableItems: AvailableItem[];
}

const DOC_TYPE_LABELS: Record<string, string> = {
    proforma: "Proforma",
    credit_invoice: "Factura Crédito",
};

function formatCurrency(value: number): string {
    return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string): string {
    if (!dateStr) return "-";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function AdmCloudDocumentsReport({ availableItems }: Props) {
    const [includeProformas, setIncludeProformas] = useState(true);
    const [includeCredit, setIncludeCredit] = useState(true);
    const [clientLabel, setClientLabel] = useState<"company" | "legal">("company");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [itemSearch, setItemSearch] = useState("");
    const [showItemPicker, setShowItemPicker] = useState(false);
    const [groupByClient, setGroupByClient] = useState(false);

    const [lines, setLines] = useState<ReportLine[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasQueried, setHasQueried] = useState(false);

    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const itemPickerRef = useRef<HTMLDivElement>(null);

    const filteredAvailableItems = availableItems.filter((item) => {
        const search = itemSearch.toLowerCase();
        return item.name.toLowerCase().includes(search) || item.code.toLowerCase().includes(search);
    });

    const toggleItem = (code: string) => {
        setSelectedItems((prev) =>
            prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
        );
    };

    const removeItem = (code: string) => {
        setSelectedItems((prev) => prev.filter((c) => c !== code));
    };

    const toggleGroup = (clientName: string) => {
        setCollapsedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(clientName)) next.delete(clientName);
            else next.add(clientName);
            return next;
        });
    };

    const handleQuery = useCallback(async () => {
        if (!includeProformas && !includeCredit) {
            setError("Selecciona al menos un tipo de documento");
            return;
        }

        setLoading(true);
        setError(null);
        setHasQueried(true);

        try {
            const types: string[] = [];
            if (includeProformas) types.push("proformas");
            if (includeCredit) types.push("credit");

            const params = new URLSearchParams();
            params.set("types", types.join(","));
            if (dateFrom) params.set("dateFrom", dateFrom);
            if (dateTo) params.set("dateTo", dateTo);
            if (selectedItems.length > 0) params.set("items", selectedItems.join(","));
            params.set("clientLabel", clientLabel);

            const res = await fetch(`/api/reports/admcloud-documents?${params.toString()}`);
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Error al consultar");
                setLines([]);
                return;
            }

            setLines(data.lines || []);
            if (data.message && (data.lines || []).length === 0) {
                setError(data.message);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error de conexión");
            setLines([]);
        } finally {
            setLoading(false);
        }
    }, [includeProformas, includeCredit, clientLabel, dateFrom, dateTo, selectedItems]);

    const handleExport = useCallback(() => {
        if (lines.length === 0) return;

        const rows = lines.map((l) => ({
            Cliente: l.clientName,
            Artículo: l.itemDescription,
            Código: l.itemCode,
            Cantidad: l.quantity,
            "Precio Unitario": l.unitPrice,
            Tasa: l.exchangeRate,
            "Descuento %": l.discountPercent,
            "Nro Documento": l.documentNumber,
            Tipo: DOC_TYPE_LABELS[l.documentType] || l.documentType,
            Fecha: l.documentDate,
            "Precio Ext.": l.extendedPrice,
        }));

        const ws = XLSX.utils.json_to_sheet(rows);

        const colWidths = [
            { wch: 30 }, // Cliente
            { wch: 40 }, // Artículo
            { wch: 18 }, // Código
            { wch: 10 }, // Cantidad
            { wch: 15 }, // Precio Unitario
            { wch: 10 }, // Tasa
            { wch: 12 }, // Descuento
            { wch: 18 }, // Nro Documento
            { wch: 16 }, // Tipo
            { wch: 12 }, // Fecha
            { wch: 15 }, // Precio Ext
        ];
        ws["!cols"] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Documentos ADMCloud");
        const today = new Date().toISOString().split("T")[0];
        XLSX.writeFile(wb, `Reporte_ADMCloud_${today}.xlsx`);
    }, [lines]);

    const groupedLines = groupByClient
        ? lines.reduce<Record<string, ReportLine[]>>((acc, line) => {
              if (!acc[line.clientName]) acc[line.clientName] = [];
              acc[line.clientName].push(line);
              return acc;
          }, {})
        : null;

    const totalExtended = lines.reduce((sum, l) => sum + l.extendedPrice, 0);

    return (
        <div className="min-h-screen bg-[var(--surface-0)] py-6 sm:py-8 overflow-x-hidden">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full min-w-0 overflow-x-hidden">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/app/reports"
                            className="h-10 w-10 rounded-xl bg-[var(--hover-bg)] flex items-center justify-center hover:bg-[var(--card-border)] transition-colors"
                        >
                            <ArrowLeft size={18} className="text-[var(--muted-text)]" />
                        </Link>
                        <div className="hidden sm:flex h-10 w-10 rounded-xl bg-ocean-blue/10 items-center justify-center">
                            <FileSpreadsheet size={20} className="text-ocean-blue" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">
                                Documentos ADMCloud
                            </h1>
                            <p className="text-sm text-[var(--muted-text)] mt-0.5">
                                Facturas a crédito y proformas
                            </p>
                        </div>
                    </div>
                    {lines.length > 0 && (
                        <button
                            onClick={handleExport}
                            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-success-green rounded-xl hover:bg-success-green/90 transition-colors shadow-sm"
                        >
                            <Download size={16} />
                            Exportar Excel
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-4 sm:p-5 mb-6 w-full min-w-0 overflow-hidden">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter size={16} className="text-[var(--muted-text)]" />
                        <h3 className="text-sm font-semibold text-[var(--foreground)]">Filtros</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 items-start gap-4 mb-4 w-full min-w-0">
                        {/* Doc types */}
                        <div className="min-w-0">
                            <label className="block text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider mb-2">
                                Tipo de documento
                            </label>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={includeProformas}
                                        onChange={(e) => setIncludeProformas(e.target.checked)}
                                        className="rounded border-[var(--card-border)] text-nearby-accent focus:ring-nearby-accent"
                                    />
                                    <span className="text-sm text-[var(--foreground)]">Proformas</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={includeCredit}
                                        onChange={(e) => setIncludeCredit(e.target.checked)}
                                        className="rounded border-[var(--card-border)] text-nearby-accent focus:ring-nearby-accent"
                                    />
                                    <span className="text-sm text-[var(--foreground)]">Facturas a crédito</span>
                                </label>
                            </div>
                        </div>

                        {/* Date From */}
                        <div className="min-w-0">
                            <label className="block text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider mb-2">
                                Desde
                            </label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-full min-w-0 max-w-full appearance-none px-3 py-2 text-sm rounded-lg border border-[var(--card-border)] bg-[var(--surface-0)] text-[var(--foreground)] focus:ring-2 focus:ring-nearby-accent/30 focus:border-nearby-accent outline-none transition-colors"
                            />
                        </div>

                        {/* Date To */}
                        <div className="min-w-0">
                            <label className="block text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider mb-2">
                                Hasta
                            </label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="w-full min-w-0 max-w-full appearance-none px-3 py-2 text-sm rounded-lg border border-[var(--card-border)] bg-[var(--surface-0)] text-[var(--foreground)] focus:ring-2 focus:ring-nearby-accent/30 focus:border-nearby-accent outline-none transition-colors"
                            />
                        </div>

                        {/* Client Label */}
                        <div className="min-w-0">
                            <label className="block text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider mb-2">
                                Mostrar cliente como
                            </label>
                            <select
                                value={clientLabel}
                                onChange={(e) => setClientLabel(e.target.value as "company" | "legal")}
                                className="w-full min-w-0 max-w-full px-3 py-2 text-sm rounded-lg border border-[var(--card-border)] bg-[var(--surface-0)] text-[var(--foreground)] focus:ring-2 focus:ring-nearby-accent/30 focus:border-nearby-accent outline-none transition-colors"
                            >
                                <option value="company">Nombre comercial</option>
                                <option value="legal">Razón social</option>
                            </select>
                        </div>

                        {/* Group toggle */}
                        <div className="min-w-0">
                            <label className="block text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider mb-2">
                                Agrupación
                            </label>
                            <button
                                onClick={() => setGroupByClient(!groupByClient)}
                                className={`w-full sm:w-auto inline-flex items-center justify-center sm:justify-start gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                                    groupByClient
                                        ? "bg-nearby-accent/10 border-nearby-accent/30 text-nearby-accent"
                                        : "border-[var(--card-border)] text-[var(--muted-text)] hover:border-nearby-accent/30"
                                }`}
                            >
                                <Users size={14} />
                                Agrupar por cliente
                            </button>
                        </div>
                    </div>

                    {/* Items filter */}
                    <div className="mb-4 w-full min-w-0" ref={itemPickerRef}>
                        <label className="block text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider mb-2">
                            Filtrar artículos
                        </label>

                        {selectedItems.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {selectedItems.map((code) => {
                                    const item = availableItems.find((i) => i.code === code);
                                    return (
                                        <span
                                            key={code}
                                            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-nearby-accent/10 text-nearby-accent"
                                        >
                                            {item?.code || code}
                                            <button onClick={() => removeItem(code)} className="hover:text-error-red">
                                                <X size={12} />
                                            </button>
                                        </span>
                                    );
                                })}
                                <button
                                    onClick={() => setSelectedItems([])}
                                    className="text-xs text-[var(--muted-text)] hover:text-error-red px-2"
                                >
                                    Limpiar
                                </button>
                            </div>
                        )}

                        <div className="relative w-full min-w-0">
                            <input
                                type="text"
                                placeholder="Buscar artículos por código o nombre..."
                                value={itemSearch}
                                onChange={(e) => {
                                    setItemSearch(e.target.value);
                                    setShowItemPicker(true);
                                }}
                                onFocus={() => setShowItemPicker(true)}
                                className="w-full md:w-96 max-w-full min-w-0 px-3 py-2 pl-9 text-sm rounded-lg border border-[var(--card-border)] bg-[var(--surface-0)] text-[var(--foreground)] focus:ring-2 focus:ring-nearby-accent/30 focus:border-nearby-accent outline-none transition-colors"
                            />
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-text)]" />

                            {showItemPicker && (
                                <div className="absolute z-20 mt-1 w-full md:w-96 max-h-60 overflow-y-auto bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-xl">
                                    {filteredAvailableItems.length === 0 ? (
                                        <p className="px-3 py-3 text-xs text-[var(--muted-text)]">Sin resultados</p>
                                    ) : (
                                        filteredAvailableItems.slice(0, 50).map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => toggleItem(item.code)}
                                                className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--hover-bg)] flex items-center gap-2 transition-colors ${
                                                    selectedItems.includes(item.code) ? "bg-nearby-accent/5" : ""
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItems.includes(item.code)}
                                                    readOnly
                                                    className="rounded border-[var(--card-border)] text-nearby-accent pointer-events-none"
                                                />
                                                <span className="font-mono text-xs text-[var(--muted-text)] w-28 shrink-0 truncate">
                                                    {item.code}
                                                </span>
                                                <span className="truncate text-[var(--foreground)]">{item.name}</span>
                                            </button>
                                        ))
                                    )}
                                    {showItemPicker && (
                                        <button
                                            onClick={() => setShowItemPicker(false)}
                                            className="w-full py-2 text-xs text-[var(--muted-text)] hover:bg-[var(--hover-bg)] border-t border-[var(--card-border)]"
                                        >
                                            Cerrar
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Query button */}
                    <button
                        onClick={handleQuery}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-nearby-dark rounded-xl hover:bg-nearby-dark-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Search size={16} />
                        )}
                        {loading ? "Consultando ADMCloud..." : "Consultar"}
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-error-red/10 text-error-red text-sm">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {/* Results */}
                {hasQueried && !loading && lines.length > 0 && (
                    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] overflow-hidden">
                        {/* Summary bar */}
                        <div className="flex items-center justify-between px-5 py-3 bg-[var(--hover-bg)] border-b border-[var(--card-border)]">
                            <span className="text-sm text-[var(--muted-text)]">
                                {lines.length} línea{lines.length !== 1 ? "s" : ""} encontrada{lines.length !== 1 ? "s" : ""}
                            </span>
                            <span className="text-sm font-semibold text-[var(--foreground)]">
                                Total: ${formatCurrency(totalExtended)}
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-[var(--card-border)]">
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-text)]">Cliente</th>
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-text)]">Artículo</th>
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-text)] text-right">Cantidad</th>
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-text)] text-right">P. Unitario</th>
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-text)] text-right">Tasa</th>
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-text)] text-right">Desc. %</th>
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-text)]">Nro Documento</th>
                                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-text)] text-right">Precio Ext.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--card-border)]">
                                    {groupByClient && groupedLines ? (
                                        Object.entries(groupedLines).map(([clientName, clientLines]) => {
                                            const isCollapsed = collapsedGroups.has(clientName);
                                            const groupTotal = clientLines.reduce((s, l) => s + l.extendedPrice, 0);
                                            return (
                                                <GroupedRows
                                                    key={clientName}
                                                    clientName={clientName}
                                                    lines={clientLines}
                                                    isCollapsed={isCollapsed}
                                                    groupTotal={groupTotal}
                                                    onToggle={() => toggleGroup(clientName)}
                                                />
                                            );
                                        })
                                    ) : (
                                        lines.map((line, idx) => (
                                            <ReportRow key={idx} line={line} showClient />
                                        ))
                                    )}
                                </tbody>
                                {/* Grand total */}
                                <tfoot>
                                    <tr className="bg-[var(--hover-bg)] border-t-2 border-[var(--card-border)]">
                                        <td colSpan={7} className="px-4 py-3 text-sm font-semibold text-[var(--foreground)]">
                                            Total General
                                        </td>
                                        <td className="px-4 py-3 text-sm font-bold text-[var(--foreground)] text-right">
                                            ${formatCurrency(totalExtended)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}

                {hasQueried && !loading && lines.length === 0 && !error && (
                    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-12 text-center">
                        <FileSpreadsheet size={40} className="mx-auto text-[var(--muted-text)] mb-3" />
                        <p className="text-sm text-[var(--muted-text)]">No se encontraron documentos con los filtros seleccionados</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function ReportRow({ line, showClient }: { line: ReportLine; showClient: boolean }) {
    return (
        <tr className="hover:bg-[var(--hover-bg)] transition-colors">
            {showClient && (
                <td className="px-4 py-2.5 text-sm text-[var(--foreground)] font-medium whitespace-nowrap">
                    {line.clientName}
                </td>
            )}
            {!showClient && <td className="px-4 py-2.5" />}
            <td className="px-4 py-2.5">
                <div className="text-sm text-[var(--foreground)]">{line.itemDescription}</div>
                {line.itemCode && (
                    <div className="text-[10px] font-mono text-[var(--muted-text)]">{line.itemCode}</div>
                )}
            </td>
            <td className="px-4 py-2.5 text-sm text-[var(--foreground)] text-right tabular-nums">
                {line.quantity}
            </td>
            <td className="px-4 py-2.5 text-sm text-[var(--foreground)] text-right tabular-nums">
                {formatCurrency(line.unitPrice)}
            </td>
            <td className="px-4 py-2.5 text-sm text-[var(--foreground)] text-right tabular-nums">
                {line.exchangeRate > 0 ? formatCurrency(line.exchangeRate) : "-"}
            </td>
            <td className="px-4 py-2.5 text-sm text-[var(--foreground)] text-right tabular-nums">
                {line.discountPercent > 0 ? `${line.discountPercent}%` : "-"}
            </td>
            <td className="px-4 py-2.5">
                <div className="text-sm text-[var(--foreground)]">{line.documentNumber}</div>
                <div className="text-[10px] text-[var(--muted-text)]">
                    {DOC_TYPE_LABELS[line.documentType]} · {formatDate(line.documentDate)}
                </div>
            </td>
            <td className="px-4 py-2.5 text-sm font-medium text-[var(--foreground)] text-right tabular-nums">
                ${formatCurrency(line.extendedPrice)}
            </td>
        </tr>
    );
}

function GroupedRows({
    clientName,
    lines,
    isCollapsed,
    groupTotal,
    onToggle,
}: {
    clientName: string;
    lines: ReportLine[];
    isCollapsed: boolean;
    groupTotal: number;
    onToggle: () => void;
}) {
    return (
        <>
            <tr
                onClick={onToggle}
                className="bg-[var(--hover-bg)] cursor-pointer hover:bg-nearby-accent/5 transition-colors"
            >
                <td colSpan={7} className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                        {isCollapsed ? (
                            <ChevronRight size={14} className="text-[var(--muted-text)]" />
                        ) : (
                            <ChevronDown size={14} className="text-[var(--muted-text)]" />
                        )}
                        <span className="text-sm font-semibold text-[var(--foreground)]">{clientName}</span>
                        <span className="text-xs text-[var(--muted-text)]">
                            ({lines.length} línea{lines.length !== 1 ? "s" : ""})
                        </span>
                    </div>
                </td>
                <td className="px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] text-right tabular-nums">
                    ${formatCurrency(groupTotal)}
                </td>
            </tr>
            {!isCollapsed &&
                lines.map((line, idx) => <ReportRow key={idx} line={line} showClient={false} />)}
        </>
    );
}
