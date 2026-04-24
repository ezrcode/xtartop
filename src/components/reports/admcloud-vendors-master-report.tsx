"use client";

import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Download, FileSpreadsheet, Loader2, Search, Truck } from "lucide-react";
import * as XLSX from "xlsx";

interface AdmCloudVendorMasterLine {
    id: string;
    name: string;
    fiscalId: string;
}

function formatDateTime(date: Date): string {
    return date.toLocaleString("es-DO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

export function AdmCloudVendorsMasterReport() {
    const [lines, setLines] = useState<AdmCloudVendorMasterLine[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasQueried, setHasQueried] = useState(false);

    const totals = useMemo(() => ({
        vendors: lines.length,
        withFiscalId: lines.filter((line) => line.fiscalId.trim().length > 0).length,
    }), [lines]);

    const handleQuery = useCallback(async () => {
        setLoading(true);
        setError(null);
        setHasQueried(true);

        try {
            const res = await fetch("/api/reports/admcloud-vendors-master");
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Error al consultar proveedores");
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
    }, []);

    const handleExport = useCallback(() => {
        if (lines.length === 0) return;

        const generatedAt = new Date();
        const headers = ["ID fiscal", "Nombre"];
        const rows = lines.map((line) => [line.fiscalId, line.name]);
        const data = [
            ["Maestro de proveedores"],
            [`Generado: ${formatDateTime(generatedAt)}`],
            [`Total de proveedores: ${totals.vendors}`],
            [`Con ID fiscal: ${totals.withFiscalId}`],
            [],
            headers,
            ...rows,
        ];

        const ws = XLSX.utils.aoa_to_sheet(data);
        ws["!merges"] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } },
            { s: { r: 3, c: 0 }, e: { r: 3, c: headers.length - 1 } },
        ];
        ws["!cols"] = [{ wch: 48 }, { wch: 24 }];
        ws["!autofilter"] = { ref: `A6:B${Math.max(lines.length + 6, 6)}` };
        ws["!freeze"] = { xSplit: 0, ySplit: 6 };

        const wb = XLSX.utils.book_new();
        wb.Props = {
            Title: "Maestro de proveedores",
            Subject: "Listado de proveedores de ADMCloud",
            Author: "NEARBY CRM",
            CreatedDate: generatedAt,
        };
        XLSX.utils.book_append_sheet(wb, ws, "Proveedores");
        const today = generatedAt.toISOString().split("T")[0];
        XLSX.writeFile(wb, `Maestro_de_Proveedores_${today}.xlsx`);
    }, [lines, totals]);

    return (
        <div className="min-h-screen bg-[var(--surface-0)] py-6 sm:py-8 overflow-x-hidden">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full min-w-0 overflow-x-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/app/reports"
                            className="h-10 w-10 rounded-lg bg-[var(--hover-bg)] flex items-center justify-center hover:bg-[var(--card-border)] transition-colors"
                        >
                            <ArrowLeft size={18} className="text-[var(--muted-text)]" />
                        </Link>
                        <div className="hidden sm:flex h-10 w-10 rounded-lg bg-nearby-dark/10 items-center justify-center">
                            <Truck size={20} className="text-nearby-dark" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">
                                Maestro de proveedores
                            </h1>
                            <p className="text-sm text-[var(--muted-text)] mt-0.5">
                                Nombre e ID fiscal de todos los proveedores existentes en ADMCloud
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

                <div className="bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)] p-4 sm:p-5 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-sm font-semibold text-[var(--foreground)]">Consulta maestra</h3>
                            <p className="text-sm text-[var(--muted-text)] mt-1">
                                Trae el catálogo completo de proveedores desde ADMCloud y permite exportarlo a Excel.
                            </p>
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
                </div>

                {error && (
                    <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-error-red/10 text-error-red text-sm">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {hasQueried && !loading && lines.length > 0 && (
                    <div className="bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)] overflow-hidden">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-5 py-4 bg-[var(--hover-bg)] border-b border-[var(--card-border)]">
                            <SummaryTile label="Proveedores" value={String(totals.vendors)} />
                            <SummaryTile label="Con ID fiscal" value={String(totals.withFiscalId)} />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px] text-left">
                                <thead>
                                    <tr className="border-b border-[var(--card-border)] bg-[var(--surface-1)]">
                                        <TableHead>ID fiscal</TableHead>
                                        <TableHead>Nombre</TableHead>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lines.map((line, index) => (
                                        <tr key={`${line.id}-${index}`} className="border-b border-[var(--card-border)] last:border-b-0">
                                            <TableCell>{line.fiscalId || "-"}</TableCell>
                                            <TableCell className="font-medium text-[var(--foreground)]">
                                                {line.name || "-"}
                                            </TableCell>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {hasQueried && !loading && !error && lines.length === 0 && (
                    <div className="rounded-lg border border-dashed border-[var(--card-border)] bg-[var(--card-bg)] p-10 text-center">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--hover-bg)] mb-4">
                            <FileSpreadsheet size={20} className="text-[var(--muted-text)]" />
                        </div>
                        <h3 className="text-base font-semibold text-[var(--foreground)] mb-1">
                            No se encontraron proveedores
                        </h3>
                        <p className="text-sm text-[var(--muted-text)]">
                            ADMCloud no devolvió registros de proveedores para este workspace.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg bg-[var(--surface-1)] border border-[var(--card-border)] p-4">
            <p className="text-xs uppercase tracking-wider text-[var(--muted-text)] mb-1">{label}</p>
            <p className="text-2xl font-semibold text-[var(--foreground)]">{value}</p>
        </div>
    );
}

function TableHead({ children }: { children: ReactNode }) {
    return (
        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-text)] whitespace-nowrap">
            {children}
        </th>
    );
}

function TableCell({ children, className = "" }: { children: ReactNode; className?: string }) {
    return (
        <td className={`px-4 py-3 text-sm text-[var(--muted-text)] whitespace-nowrap ${className}`}>
            {children}
        </td>
    );
}
