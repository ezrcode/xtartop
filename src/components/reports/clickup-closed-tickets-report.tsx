"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, Download, Loader2, Search } from "lucide-react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface TicketLine {
    id: string;
    name: string;
    status: string;
    closedAt: string;
    closedDate: string;
    client: string;
    assignees: string[];
    url: string;
}

type GroupBy = "week" | "client" | "assignee";
type BreakdownBy = "none" | "week" | "client" | "assignee";

interface GroupedRow {
    key: string;
    label: string;
    tickets: number;
}

interface ClickUpClosedTicketsReportProps {
    workspaceName?: string;
    workspaceLogoUrl?: string | null;
}

function formatDateForInput(date: Date): string {
    return date.toISOString().split("T")[0];
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getWeekRangeLabel(dateStr: string): string {
    const date = new Date(dateStr);
    const day = date.getDay();
    const start = new Date(date);
    start.setDate(date.getDate() - day); // Sunday
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6); // Saturday

    const startLabel = start.toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit" });
    const endLabel = end.toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit" });
    return `${startLabel} - ${endLabel}`;
}

function buildRows(lines: TicketLine[], groupBy: GroupBy): GroupedRow[] {
    const map = new Map<string, number>();

    for (const line of lines) {
        if (groupBy === "week") {
            const key = getWeekRangeLabel(line.closedDate);
            map.set(key, (map.get(key) || 0) + 1);
            continue;
        }

        if (groupBy === "client") {
            const key = line.client || "Sin cliente";
            map.set(key, (map.get(key) || 0) + 1);
            continue;
        }

        const assignees = line.assignees.length > 0 ? line.assignees : ["Sin asignado"];
        for (const assignee of assignees) {
            map.set(assignee, (map.get(assignee) || 0) + 1);
        }
    }

    return Array.from(map.entries())
        .map(([label, tickets]) => ({ key: label, label, tickets }))
        .sort((a, b) => b.tickets - a.tickets);
}

async function loadImageAsDataUrl(imageUrl: string): Promise<string | null> {
    try {
        const response = await fetch(imageUrl, { mode: "cors" });
        if (!response.ok) return null;
        const blob = await response.blob();
        const dataUrl: string = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string) || "");
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
        return dataUrl || null;
    } catch {
        return null;
    }
}

function addPdfPageNumbers(pdf: jsPDF) {
    const pageCount = pdf.getNumberOfPages();
    for (let page = 1; page <= pageCount; page++) {
        pdf.setPage(page);
        pdf.setFontSize(8);
        pdf.setTextColor(120, 130, 145);
        pdf.text(`Página ${page} de ${pageCount}`, 195, 290, { align: "right" });
    }
}

export function ClickUpClosedTicketsReport({
    workspaceName = "Workspace",
    workspaceLogoUrl = null,
}: ClickUpClosedTicketsReportProps) {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [dateFrom, setDateFrom] = useState(formatDateForInput(firstOfMonth));
    const [dateTo, setDateTo] = useState(formatDateForInput(now));
    const [groupBy, setGroupBy] = useState<GroupBy>("week");
    const [breakdownBy, setBreakdownBy] = useState<BreakdownBy>("client");
    const [clientFilter, setClientFilter] = useState("all");
    const [assigneeFilter, setAssigneeFilter] = useState("all");

    const [loading, setLoading] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lines, setLines] = useState<TicketLine[]>([]);
    const [hasQueried, setHasQueried] = useState(false);
    const chartContainerRef = useRef<HTMLDivElement>(null);

    const clients = useMemo(() => {
        return Array.from(new Set(lines.map((line) => line.client).filter(Boolean))).sort();
    }, [lines]);

    const assignees = useMemo(() => {
        const set = new Set<string>();
        for (const line of lines) {
            for (const assignee of line.assignees) {
                if (assignee) set.add(assignee);
            }
        }
        return Array.from(set).sort();
    }, [lines]);

    const filteredLines = useMemo(() => {
        return lines.filter((line) => {
            if (clientFilter !== "all" && line.client !== clientFilter) return false;
            if (assigneeFilter !== "all") {
                const list = line.assignees.length > 0 ? line.assignees : ["Sin asignado"];
                if (!list.includes(assigneeFilter)) return false;
            }
            return true;
        });
    }, [lines, clientFilter, assigneeFilter]);

    const groupedRows = useMemo(() => buildRows(filteredLines, groupBy), [filteredLines, groupBy]);

    const breakdownRows = useMemo(() => {
        if (breakdownBy === "none") return [];
        return buildRows(filteredLines, breakdownBy);
    }, [filteredLines, breakdownBy]);

    const handleQuery = async () => {
        setLoading(true);
        setError(null);
        setHasQueried(true);
        try {
            const params = new URLSearchParams();
            if (dateFrom) params.set("dateFrom", dateFrom);
            if (dateTo) params.set("dateTo", dateTo);

            const res = await fetch(`/api/reports/clickup-closed-tickets?${params.toString()}`);
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Error consultando tickets");
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
    };

    const handleExportPdf = async () => {
        setExportingPdf(true);
        try {
            const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

            let y = 14;
            if (workspaceLogoUrl) {
                const logo = await loadImageAsDataUrl(workspaceLogoUrl);
                if (logo) {
                    pdf.addImage(logo, "PNG", 14, y - 2, 16, 16);
                }
            }
            pdf.setFontSize(14);
            pdf.setTextColor(28, 40, 56);
            pdf.text(workspaceName, 34, y + 2);
            pdf.setFontSize(10);
            pdf.setTextColor(120, 130, 145);
            pdf.text("Reporte Customer Success", 34, y + 7);
            y += 16;
            pdf.setDrawColor(220, 227, 236);
            pdf.line(14, y - 3, 196, y - 3);
            pdf.setFontSize(14);
            pdf.setTextColor(28, 40, 56);
            pdf.text("Tickets Cerrados - ClickUp", 14, y);
            y += 6;
            pdf.setFontSize(10);
            pdf.text(`Rango: ${dateFrom || "-"} a ${dateTo || "-"}`, 14, y);
            y += 5;
            pdf.text(`Agrupación principal: ${groupBy}`, 14, y);
            y += 5;
            pdf.text(`Desglose secundario: ${breakdownBy}`, 14, y);
            y += 5;
            pdf.text(`Total tickets: ${filteredLines.length}`, 14, y);
            y += 8;

            if (chartContainerRef.current) {
                const canvas = await html2canvas(chartContainerRef.current, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: "#ffffff",
                });
                const imgData = canvas.toDataURL("image/png");
                const imgWidth = 182;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                pdf.addImage(imgData, "PNG", 14, y, imgWidth, imgHeight);
                y += imgHeight + 8;
            }

            if (y > 260) {
                pdf.addPage();
                y = 14;
            }

            pdf.setFontSize(11);
            pdf.text("Resumen", 14, y);
            y += 6;
            pdf.setFontSize(9);
            groupedRows.slice(0, 24).forEach((row) => {
                if (y > 280) {
                    pdf.addPage();
                    y = 14;
                }
                pdf.text(`${row.label}: ${row.tickets}`, 14, y);
                y += 4.5;
            });

            y += 3;
            pdf.setFontSize(11);
            pdf.text("Detalle", 14, y);
            y += 6;
            pdf.setFontSize(8);
            filteredLines.slice(0, 60).forEach((line) => {
                if (y > 280) {
                    pdf.addPage();
                    y = 14;
                }
                const assignees = line.assignees.length > 0 ? line.assignees.join(", ") : "Sin asignado";
                const row = `${line.closedDate} | ${line.client} | ${assignees} | ${line.name}`;
                pdf.text(row.slice(0, 130), 14, y);
                y += 4.2;
            });

            addPdfPageNumbers(pdf);
            pdf.save(`Customer_Success_Tickets_${new Date().toISOString().split("T")[0]}.pdf`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error exportando PDF");
        } finally {
            setExportingPdf(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--surface-0)] py-6 sm:py-8">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="relative overflow-hidden bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] p-4 sm:p-6 mb-6">
                    <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-success-green/10 blur-2xl" />
                    <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-ocean-blue/10 blur-2xl" />
                    <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/app/reports"
                            className="h-10 w-10 rounded-xl bg-[var(--hover-bg)] flex items-center justify-center hover:bg-[var(--card-border)] transition-colors"
                        >
                            <ArrowLeft size={18} className="text-[var(--muted-text)]" />
                        </Link>
                        <div className="hidden sm:flex h-10 w-10 rounded-xl bg-success-green/15 items-center justify-center">
                            <BarChart3 size={20} className="text-success-green" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">
                                Tickets Cerrados ClickUp
                            </h1>
                            <p className="text-sm text-[var(--muted-text)] mt-0.5">
                                Customer Success - lista SOPORTE (estado completados)
                            </p>
                        </div>
                    </div>

                    {groupedRows.length > 0 && (
                        <button
                            onClick={handleExportPdf}
                            disabled={exportingPdf}
                            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-success-green rounded-xl hover:bg-success-green/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {exportingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                            {exportingPdf ? "Generando PDF..." : "Exportar PDF"}
                        </button>
                    )}
                </div>
                </div>

                <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] p-4 sm:p-5 mb-6">
                    <div className="mb-3">
                        <h3 className="text-sm font-semibold text-[var(--foreground)]">Filtros y agrupaciones</h3>
                        <p className="text-xs text-[var(--muted-text)] mt-0.5">Configura el rango de fechas y la forma de análisis.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider mb-2">
                                Desde
                            </label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--card-border)] bg-[var(--surface-0)] text-[var(--foreground)]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider mb-2">
                                Hasta
                            </label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--card-border)] bg-[var(--surface-0)] text-[var(--foreground)]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider mb-2">
                                Agrupación principal
                            </label>
                            <select
                                value={groupBy}
                                onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--card-border)] bg-[var(--surface-0)] text-[var(--foreground)]"
                            >
                                <option value="week">Semana (domingo a sábado)</option>
                                <option value="client">Cliente</option>
                                <option value="assignee">Asignado</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider mb-2">
                                Desglose secundario
                            </label>
                            <select
                                value={breakdownBy}
                                onChange={(e) => setBreakdownBy(e.target.value as BreakdownBy)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--card-border)] bg-[var(--surface-0)] text-[var(--foreground)]"
                            >
                                <option value="none">Sin desglose</option>
                                <option value="week">Semana</option>
                                <option value="client">Cliente</option>
                                <option value="assignee">Asignado</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <div>
                            <label className="block text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider mb-2">
                                Filtrar cliente
                            </label>
                            <select
                                value={clientFilter}
                                onChange={(e) => setClientFilter(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--card-border)] bg-[var(--surface-0)] text-[var(--foreground)]"
                            >
                                <option value="all">Todos</option>
                                {clients.map((client) => (
                                    <option key={client} value={client}>
                                        {client}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider mb-2">
                                Filtrar asignado
                            </label>
                            <select
                                value={assigneeFilter}
                                onChange={(e) => setAssigneeFilter(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--card-border)] bg-[var(--surface-0)] text-[var(--foreground)]"
                            >
                                <option value="all">Todos</option>
                                {assignees.map((assignee) => (
                                    <option key={assignee} value={assignee}>
                                        {assignee}
                                    </option>
                                ))}
                                <option value="Sin asignado">Sin asignado</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-4">
                        <button
                            onClick={handleQuery}
                            disabled={loading}
                            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-nearby-dark rounded-xl hover:bg-nearby-dark-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                            {loading ? "Consultando ClickUp..." : "Consultar"}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-error-red/10 text-error-red text-sm">{error}</div>
                )}

                {hasQueried && !loading && groupedRows.length > 0 && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-gradient-to-br from-success-green/10 to-success-green/5 rounded-xl border border-success-green/20 p-4">
                                <p className="text-xs text-[var(--muted-text)] uppercase tracking-wider">Tickets cerrados</p>
                                <p className="text-2xl font-bold text-[var(--foreground)] mt-1">{filteredLines.length}</p>
                            </div>
                            <div className="bg-gradient-to-br from-ocean-blue/10 to-ocean-blue/5 rounded-xl border border-ocean-blue/20 p-4">
                                <p className="text-xs text-[var(--muted-text)] uppercase tracking-wider">Clientes</p>
                                <p className="text-2xl font-bold text-[var(--foreground)] mt-1">{clients.length}</p>
                            </div>
                            <div className="bg-gradient-to-br from-nearby-accent/10 to-nearby-accent/5 rounded-xl border border-nearby-accent/20 p-4">
                                <p className="text-xs text-[var(--muted-text)] uppercase tracking-wider">Asignados</p>
                                <p className="text-2xl font-bold text-[var(--foreground)] mt-1">{assignees.length}</p>
                            </div>
                        </div>

                        <div ref={chartContainerRef} className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] p-4 sm:p-5">
                            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">
                                Distribución por {groupBy === "week" ? "semana" : groupBy === "client" ? "cliente" : "asignado"}
                            </h3>
                            <div className="h-[320px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={groupedRows}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                                        <XAxis dataKey="label" tick={{ fill: "var(--muted-text)", fontSize: 11 }} interval={0} angle={-18} height={58} />
                                        <YAxis allowDecimals={false} tick={{ fill: "var(--muted-text)", fontSize: 12 }} />
                                        <Tooltip />
                                        <Bar dataKey="tickets" fill="#1BC47D" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] overflow-hidden">
                                <div className="px-4 py-3 border-b border-[var(--card-border)] bg-[var(--hover-bg)]">
                                    <h3 className="text-sm font-semibold text-[var(--foreground)]">Resumen agrupado</h3>
                                </div>
                                <div className="max-h-80 overflow-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-[var(--surface-2)]">
                                            <tr>
                                                <th className="text-left px-4 py-2 text-xs text-[var(--muted-text)] uppercase">Grupo</th>
                                                <th className="text-right px-4 py-2 text-xs text-[var(--muted-text)] uppercase">Tickets</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--card-border)]">
                                            {groupedRows.map((row) => (
                                                <tr key={row.key}>
                                                    <td className="px-4 py-2 text-[var(--foreground)]">{row.label}</td>
                                                    <td className="px-4 py-2 text-right text-[var(--foreground)] font-semibold">{row.tickets}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {breakdownBy !== "none" && (
                                <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] overflow-hidden">
                                    <div className="px-4 py-3 border-b border-[var(--card-border)] bg-[var(--hover-bg)]">
                                        <h3 className="text-sm font-semibold text-[var(--foreground)]">Desglose secundario</h3>
                                    </div>
                                    <div className="max-h-80 overflow-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-[var(--surface-2)]">
                                                <tr>
                                                    <th className="text-left px-4 py-2 text-xs text-[var(--muted-text)] uppercase">Grupo</th>
                                                    <th className="text-right px-4 py-2 text-xs text-[var(--muted-text)] uppercase">Tickets</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--card-border)]">
                                                {breakdownRows.map((row) => (
                                                    <tr key={row.key}>
                                                        <td className="px-4 py-2 text-[var(--foreground)]">{row.label}</td>
                                                        <td className="px-4 py-2 text-right text-[var(--foreground)] font-semibold">{row.tickets}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] overflow-hidden">
                            <div className="px-4 py-3 border-b border-[var(--card-border)] bg-[var(--hover-bg)]">
                                <h3 className="text-sm font-semibold text-[var(--foreground)]">Tickets cerrados</h3>
                            </div>
                            <div className="max-h-96 overflow-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-[var(--surface-2)]">
                                        <tr>
                                            <th className="text-left px-4 py-2 text-xs text-[var(--muted-text)] uppercase">Cierre</th>
                                            <th className="text-left px-4 py-2 text-xs text-[var(--muted-text)] uppercase">Ticket</th>
                                            <th className="text-left px-4 py-2 text-xs text-[var(--muted-text)] uppercase">Cliente</th>
                                            <th className="text-left px-4 py-2 text-xs text-[var(--muted-text)] uppercase">Asignados</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--card-border)]">
                                        {filteredLines.map((line) => (
                                            <tr key={line.id}>
                                                <td className="px-4 py-2 text-[var(--foreground)] whitespace-nowrap">
                                                    {formatDate(line.closedDate)}
                                                </td>
                                                <td className="px-4 py-2 text-nearby-accent">
                                                    <a href={line.url} target="_blank" rel="noreferrer" className="hover:underline">
                                                        {line.name}
                                                    </a>
                                                </td>
                                                <td className="px-4 py-2 text-[var(--foreground)]">{line.client}</td>
                                                <td className="px-4 py-2 text-[var(--foreground)]">
                                                    {line.assignees.length > 0 ? line.assignees.join(", ") : "Sin asignado"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {hasQueried && !loading && groupedRows.length === 0 && !error && (
                    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-12 text-center">
                        <p className="text-sm text-[var(--muted-text)]">
                            No se encontraron tickets cerrados en estado completado para el rango seleccionado.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
