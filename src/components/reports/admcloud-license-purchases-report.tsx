"use client";

import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Download, FileSpreadsheet, Filter, Loader2, Search } from "lucide-react";
import * as XLSX from "xlsx";

const DEFAULT_VENDOR_NAME = "DECIMA TECH LLC";

interface LicensePurchaseReportLine {
    documentNumber: string;
    reference: string;
    documentDate: string;
    vendorName: string;
    currency: string;
    itemCode: string;
    description: string;
    quantity: number;
    unit: string;
    price: number;
    discountPercent: number;
    amount: number;
    exchangeRate: number;
    amountDop: number;
}

function formatNumber(value: number, decimals = 2): string {
    return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatCurrency(value: number, currency = "US$"): string {
    return `${currency}${formatNumber(value)}`;
}

function formatDate(dateStr: string): string {
    if (!dateStr) return "-";
    const d = new Date(`${dateStr}T00:00:00`);
    return d.toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" });
}

function toExcelDate(dateStr: string): Date | string {
    if (!dateStr) return "";
    return new Date(`${dateStr}T00:00:00`);
}

export function AdmCloudLicensePurchasesReport() {
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [search, setSearch] = useState("");
    const [onlyDecimaTech, setOnlyDecimaTech] = useState(true);
    const [lines, setLines] = useState<LicensePurchaseReportLine[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasQueried, setHasQueried] = useState(false);

    const totals = useMemo(() => lines.reduce(
        (acc, line) => ({
            amount: acc.amount + line.amount,
            amountDop: acc.amountDop + line.amountDop,
        }),
        { amount: 0, amountDop: 0 }
    ), [lines]);

    const handleQuery = useCallback(async () => {
        setLoading(true);
        setError(null);
        setHasQueried(true);

        try {
            const params = new URLSearchParams();
            if (dateFrom) params.set("dateFrom", dateFrom);
            if (dateTo) params.set("dateTo", dateTo);
            if (search.trim()) params.set("search", search.trim());
            if (onlyDecimaTech) params.set("vendorName", DEFAULT_VENDOR_NAME);

            const res = await fetch(`/api/reports/admcloud-license-purchases?${params.toString()}`);
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Error al consultar compras de licencias");
                setLines([]);
                return;
            }

            setLines(data.lines || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error de conexión");
            setLines([]);
        } finally {
            setLoading(false);
        }
    }, [dateFrom, dateTo, onlyDecimaTech, search]);

    const handleExport = useCallback(() => {
        if (lines.length === 0) return;

        const generatedAt = new Date();
        const headers = [
            "Número",
            "Referencia",
            "Fecha",
            "Proveedor",
            "Moneda",
            "Artículo",
            "Descripción",
            "Cantidad",
            "Unidad",
            "Precio",
            "% Descuento",
            "Monto",
            "Tasa de cambio",
            "Monto en DOP",
        ];

        const rows = lines.map((line) => [
            line.documentNumber,
            line.reference,
            toExcelDate(line.documentDate),
            line.vendorName,
            line.currency,
            line.itemCode,
            line.description,
            line.quantity,
            line.unit,
            line.price,
            line.discountPercent,
            line.amount,
            line.exchangeRate,
            line.amountDop,
        ]);

        const data = [
            ["Compra de licencias"],
            [`Rango: ${dateFrom || "inicio"} - ${dateTo || "fin"}`],
            [`Proveedor: ${onlyDecimaTech ? DEFAULT_VENDOR_NAME : "Todos"}`],
            [`Generado: ${generatedAt.toLocaleString("es-DO")}`],
            [],
            headers,
            ...rows,
            [],
            ["", "", "", "", "", "", "Totales", "", "", "", "", totals.amount, "", totals.amountDop],
        ];

        const ws = XLSX.utils.aoa_to_sheet(data);
        ws["!merges"] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } },
            { s: { r: 3, c: 0 }, e: { r: 3, c: headers.length - 1 } },
        ];
        ws["!cols"] = [
            { wch: 12 },
            { wch: 14 },
            { wch: 13 },
            { wch: 26 },
            { wch: 10 },
            { wch: 16 },
            { wch: 48 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 14 },
            { wch: 14 },
            { wch: 16 },
            { wch: 16 },
        ];
        ws["!autofilter"] = { ref: `A6:N${Math.max(lines.length + 6, 6)}` };
        ws["!freeze"] = { xSplit: 0, ySplit: 6 };

        for (let r = 7; r <= lines.length + 6; r += 1) {
            ws[`C${r}`] && (ws[`C${r}`].z = "dd mmm yyyy");
            ws[`H${r}`] && (ws[`H${r}`].z = "#,##0.00");
            ws[`J${r}`] && (ws[`J${r}`].z = "#,##0.000");
            ws[`K${r}`] && (ws[`K${r}`].z = "0.0000");
            ws[`L${r}`] && (ws[`L${r}`].z = "#,##0.00");
            ws[`M${r}`] && (ws[`M${r}`].z = "#,##0.0000");
            ws[`N${r}`] && (ws[`N${r}`].z = "#,##0.00");
        }

        const totalRow = lines.length + 8;
        ws[`L${totalRow}`] && (ws[`L${totalRow}`].z = "#,##0.00");
        ws[`N${totalRow}`] && (ws[`N${totalRow}`].z = "#,##0.00");

        const wb = XLSX.utils.book_new();
        wb.Props = {
            Title: "Compra de licencias",
            Subject: "Reporte de compras de licencias ADMCloud",
            Author: "NEARBY CRM",
            CreatedDate: generatedAt,
        };
        XLSX.utils.book_append_sheet(wb, ws, "Compra Licencias");
        const today = generatedAt.toISOString().split("T")[0];
        XLSX.writeFile(wb, `Compra_de_Licencias_${today}.xlsx`);
    }, [dateFrom, dateTo, lines, onlyDecimaTech, totals]);

    return (
        <div className="min-h-screen bg-[var(--surface-0)] py-6 sm:py-8 overflow-x-hidden">
            <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 w-full min-w-0 overflow-x-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/app/reports"
                            className="h-10 w-10 rounded-lg bg-[var(--hover-bg)] flex items-center justify-center hover:bg-[var(--card-border)] transition-colors"
                        >
                            <ArrowLeft size={18} className="text-[var(--muted-text)]" />
                        </Link>
                        <div className="hidden sm:flex h-10 w-10 rounded-lg bg-ocean-blue/10 items-center justify-center">
                            <FileSpreadsheet size={20} className="text-ocean-blue" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">
                                Compra de licencias
                            </h1>
                            <p className="text-sm text-[var(--muted-text)] mt-0.5">
                                Facturas de proveedor desde ADMCloud con tasa y monto en DOP
                            </p>
                        </div>
                    </div>
                    {lines.length > 0 && (
                        <button
                            onClick={handleExport}
                            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-success-green rounded-lg hover:bg-success-green/90 transition-colors shadow-sm"
                        >
                            <Download size={16} />
                            Exportar Excel
                        </button>
                    )}
                </div>

                <div className="bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)] p-4 sm:p-5 mb-6 w-full min-w-0">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter size={16} className="text-[var(--muted-text)]" />
                        <h3 className="text-sm font-semibold text-[var(--foreground)]">Filtros</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[180px_180px_minmax(280px,1fr)_auto] items-end gap-4">
                        <div className="min-w-0">
                            <label className="block text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider mb-2">
                                Desde
                            </label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-full min-w-0 max-w-full appearance-none px-3 py-2 text-sm rounded-lg border border-[var(--card-border)] bg-[var(--surface-0)] text-[var(--foreground)] focus:ring-2 focus:ring-nearby-dark/15 focus:border-nearby-dark/50 outline-none transition-colors"
                            />
                        </div>
                        <div className="min-w-0">
                            <label className="block text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider mb-2">
                                Hasta
                            </label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="w-full min-w-0 max-w-full appearance-none px-3 py-2 text-sm rounded-lg border border-[var(--card-border)] bg-[var(--surface-0)] text-[var(--foreground)] focus:ring-2 focus:ring-nearby-dark/15 focus:border-nearby-dark/50 outline-none transition-colors"
                            />
                        </div>
                        <div className="min-w-0">
                            <label className="block text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider mb-2">
                                Buscar
                            </label>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-text)]" />
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Proveedor, artículo, referencia o número..."
                                    className="w-full px-3 py-2 pl-9 text-sm rounded-lg border border-[var(--card-border)] bg-[var(--surface-0)] text-[var(--foreground)] focus:ring-2 focus:ring-nearby-dark/15 focus:border-nearby-dark/50 outline-none transition-colors"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleQuery}
                            disabled={loading}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-nearby-dark rounded-lg hover:bg-nearby-dark-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                            {loading ? "Consultando..." : "Consultar"}
                        </button>
                    </div>
                    <label className="mt-4 inline-flex items-start gap-3 rounded-lg border border-[var(--card-border)] bg-[var(--surface-1)] px-3 py-2.5 cursor-pointer hover:border-nearby-dark/30 transition-colors">
                        <input
                            type="checkbox"
                            checked={onlyDecimaTech}
                            onChange={(e) => setOnlyDecimaTech(e.target.checked)}
                            className="mt-0.5 rounded border-[var(--card-border)] text-nearby-dark focus:ring-nearby-dark/30"
                        />
                        <span>
                            <span className="block text-sm font-semibold text-[var(--foreground)]">{DEFAULT_VENDOR_NAME}</span>
                            <span className="block text-xs text-[var(--muted-text)]">
                                Filtrar por el proveedor principal de licencias. Desmárcalo para consultar todos los suplidores.
                            </span>
                        </span>
                    </label>
                </div>

                {error && (
                    <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-error-red/10 text-error-red text-sm">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {hasQueried && !loading && lines.length > 0 && (
                    <div className="bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)] overflow-hidden">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-5 py-4 bg-[var(--hover-bg)] border-b border-[var(--card-border)]">
                            <SummaryTile label="Líneas" value={String(lines.length)} />
                            <SummaryTile label="Total USD" value={formatCurrency(totals.amount)} />
                            <SummaryTile label="Total DOP" value={formatCurrency(totals.amountDop, "RD$")} />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1320px] text-left">
                                <thead>
                                    <tr className="border-b border-[var(--card-border)] bg-[var(--surface-1)]">
                                        <TableHead>Número</TableHead>
                                        <TableHead>Referencia</TableHead>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Proveedor</TableHead>
                                        <TableHead>Moneda</TableHead>
                                        <TableHead>Artículo</TableHead>
                                        <TableHead>Descripción</TableHead>
                                        <TableHead align="right">Cantidad</TableHead>
                                        <TableHead>Unidad</TableHead>
                                        <TableHead align="right">Precio</TableHead>
                                        <TableHead align="right">% Descuento</TableHead>
                                        <TableHead align="right">Monto</TableHead>
                                        <TableHead align="right">Tasa cambio</TableHead>
                                        <TableHead align="right">Monto en DOP</TableHead>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--card-border)]">
                                    {lines.map((line, idx) => (
                                        <ReportRow key={`${line.documentNumber}-${line.itemCode}-${idx}`} line={line} />
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-[var(--hover-bg)] border-t-2 border-[var(--card-border)]">
                                        <td colSpan={11} className="px-4 py-3 text-sm font-semibold text-[var(--foreground)]">
                                            Total general
                                        </td>
                                        <td className="px-4 py-3 text-sm font-bold text-[var(--foreground)] text-right tabular-nums">
                                            {formatCurrency(totals.amount)}
                                        </td>
                                        <td />
                                        <td className="px-4 py-3 text-sm font-bold text-[var(--foreground)] text-right tabular-nums">
                                            {formatCurrency(totals.amountDop, "RD$")}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}

                {hasQueried && !loading && lines.length === 0 && !error && (
                    <div className="bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)] p-12 text-center">
                        <FileSpreadsheet size={40} className="mx-auto text-[var(--muted-text)] mb-3" />
                        <p className="text-sm text-[var(--muted-text)]">No se encontraron compras de licencias con los filtros seleccionados</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-text)]">{label}</p>
            <p className="mt-1 text-lg font-bold text-[var(--foreground)] tabular-nums">{value}</p>
        </div>
    );
}

function TableHead({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" }) {
    return (
        <th className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-text)] ${align === "right" ? "text-right" : "text-left"}`}>
            {children}
        </th>
    );
}

function ReportRow({ line }: { line: LicensePurchaseReportLine }) {
    return (
        <tr className="hover:bg-[var(--hover-bg)] transition-colors">
            <TableCell mono>{line.documentNumber}</TableCell>
            <TableCell mono>{line.reference || "-"}</TableCell>
            <TableCell>{formatDate(line.documentDate)}</TableCell>
            <TableCell strong>{line.vendorName || "-"}</TableCell>
            <TableCell>{line.currency || "-"}</TableCell>
            <TableCell mono>{line.itemCode || "-"}</TableCell>
            <TableCell>{line.description || "-"}</TableCell>
            <TableCell align="right">{formatNumber(line.quantity)}</TableCell>
            <TableCell>{line.unit || "-"}</TableCell>
            <TableCell align="right">{formatNumber(line.price, 3)}</TableCell>
            <TableCell align="right">{line.discountPercent > 0 ? formatNumber(line.discountPercent, 4) : "-"}</TableCell>
            <TableCell align="right" strong>{formatCurrency(line.amount)}</TableCell>
            <TableCell align="right">{line.exchangeRate > 0 ? formatNumber(line.exchangeRate, 4) : "-"}</TableCell>
            <TableCell align="right" strong>{formatCurrency(line.amountDop, "RD$")}</TableCell>
        </tr>
    );
}

function TableCell({
    children,
    align = "left",
    mono = false,
    strong = false,
}: {
    children: ReactNode;
    align?: "left" | "right";
    mono?: boolean;
    strong?: boolean;
}) {
    return (
        <td className={`px-4 py-2.5 text-sm text-[var(--foreground)] ${align === "right" ? "text-right tabular-nums" : "text-left"} ${mono ? "font-mono text-xs" : ""} ${strong ? "font-semibold" : ""}`}>
            {children}
        </td>
    );
}
