"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, Download, Loader2, Search, Bug } from "lucide-react";
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

interface TicketsReportApiResponse {
    lines?: TicketLine[];
    clients?: string[];
    assignees?: string[];
    error?: string;
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

async function loadImageAsDataUrl(imageUrl: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
    try {
        const response = await fetch(imageUrl, { mode: "cors" });
        if (!response.ok) return null;
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string) || "");
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });

        if (!dataUrl) return null;

        const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve({ width: image.naturalWidth || 1, height: image.naturalHeight || 1 });
            image.onerror = () => reject(new Error("No se pudo leer el logo"));
            image.src = dataUrl;
        });

        return { dataUrl, width: dimensions.width, height: dimensions.height };
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
    const [clientsFromApi, setClientsFromApi] = useState<string[]>([]);
    const [assigneesFromApi, setAssigneesFromApi] = useState<string[]>([]);
    const [hasQueried, setHasQueried] = useState(false);
    const [debugLoading, setDebugLoading] = useState(false);
    const [debugPayload, setDebugPayload] = useState<any>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);

    const clients = useMemo(() => {
        const sanitize = (value: string) => value.trim();

        const fromApi = clientsFromApi
            .map(sanitize)
            .filter((value) => value.length > 0 && value.toLowerCase() !== "sin cliente");

        const fromLines = buildRows(lines, "client")
            .map((row) => row.label.trim())
            .filter((value) => value.length > 0 && value.toLowerCase() !== "sin cliente");

        return Array.from(new Set([...fromApi, ...fromLines])).sort((a, b) => a.localeCompare(b, "es"));
    }, [clientsFromApi, lines]);

    const assignees = useMemo(() => {
        const fromApi = assigneesFromApi
            .map((value) => value.trim())
            .filter((value) => value.length > 0 && value.toLowerCase() !== "sin asignado");

        const fromLines = buildRows(lines, "assignee")
            .map((row) => row.label.trim())
            .filter((value) => value.length > 0 && value.toLowerCase() !== "sin asignado");

        return Array.from(new Set([...fromApi, ...fromLines])).sort((a, b) => a.localeCompare(b, "es"));
    }, [assigneesFromApi, lines]);

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
            const data = (await res.json()) as TicketsReportApiResponse;
            if (!res.ok) {
                setError(data.error || "Error consultando tickets");
                setLines([]);
                setClientsFromApi([]);
                setAssigneesFromApi([]);
                return;
            }
            setLines(data.lines || []);
            setClientsFromApi(data.clients || []);
            setAssigneesFromApi(data.assignees || []);
            setClientFilter("all");
            setAssigneeFilter("all");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error de conexión");
            setLines([]);
            setClientsFromApi([]);
            setAssigneesFromApi([]);
            setClientFilter("all");
            setAssigneeFilter("all");
        } finally {
            setLoading(false);
        }
    };

    const handleExportPdf = async () => {
        setExportingPdf(true);
        try {
            const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const pageWidth = 210;
            const marginX = 14;
            const contentWidth = pageWidth - marginX * 2;
            let y = 14;

            // Top brand line
            pdf.setFillColor(252, 90, 52);
            pdf.rect(0, 0, pageWidth, 6, "F");

            // Header block
            pdf.setFillColor(247, 250, 253);
            pdf.roundedRect(marginX, y, contentWidth, 24, 2, 2, "F");
            pdf.setDrawColor(220, 227, 236);
            pdf.roundedRect(marginX, y, contentWidth, 24, 2, 2);

            if (workspaceLogoUrl) {
                const logo = await loadImageAsDataUrl(workspaceLogoUrl);
                if (logo) {
                    const maxLogoW = 24;
                    const maxLogoH = 10;
                    const ratio = logo.width / logo.height;
                    let drawW = maxLogoW;
                    let drawH = drawW / ratio;
                    if (drawH > maxLogoH) {
                        drawH = maxLogoH;
                        drawW = drawH * ratio;
                    }
                    pdf.addImage(logo.dataUrl, "PNG", marginX + 2, y + 2.5, drawW, drawH);
                }
            }

            pdf.setTextColor(28, 40, 56);
            pdf.setFontSize(13);
            pdf.text(workspaceName, marginX + 30, y + 7.5);
            pdf.setFontSize(9);
            pdf.setTextColor(104, 118, 138);
            pdf.text("Reporte de Customer Success", marginX + 30, y + 13);
            pdf.text(`Generado: ${new Date().toLocaleString("es-DO")}`, marginX + 30, y + 18);
            y += 30;

            pdf.setTextColor(28, 40, 56);
            pdf.setFontSize(14);
            pdf.text("Tickets Cerrados - ClickUp", marginX, y);
            y += 6;

            // Metadata row
            pdf.setFillColor(250, 252, 255);
            pdf.roundedRect(marginX, y, contentWidth, 16, 2, 2, "F");
            pdf.setDrawColor(225, 233, 243);
            pdf.roundedRect(marginX, y, contentWidth, 16, 2, 2);
            pdf.setFontSize(9);
            pdf.setTextColor(96, 111, 132);
            pdf.text(`Rango: ${dateFrom || "-"} a ${dateTo || "-"}`, marginX + 3, y + 6);
            pdf.text(`Agrupación: ${groupBy}`, marginX + 3, y + 11);
            pdf.text(`Desglose: ${breakdownBy}`, marginX + 70, y + 6);
            pdf.text(`Total tickets: ${filteredLines.length}`, marginX + 70, y + 11);
            y += 20;

            // Chart section
            if (chartContainerRef.current) {
                const canvas = await html2canvas(chartContainerRef.current, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: "#ffffff",
                });
                const imgData = canvas.toDataURL("image/png");
                const imgWidth = contentWidth;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                const safeHeight = Math.min(92, imgHeight);
                pdf.setFontSize(10);
                pdf.setTextColor(28, 40, 56);
                pdf.text("Visualización principal", marginX, y);
                y += 3;
                pdf.setDrawColor(220, 227, 236);
                pdf.roundedRect(marginX, y, contentWidth, safeHeight + 4, 2, 2);
                pdf.addImage(imgData, "PNG", marginX + 2, y + 2, contentWidth - 4, safeHeight);
                y += safeHeight + 10;
            }

            const ensureSpace = (needed: number) => {
                if (y + needed > 280) {
                    pdf.addPage();
                    y = 16;
                }
            };

            // Summary table
            ensureSpace(20);
            pdf.setFontSize(11);
            pdf.setTextColor(28, 40, 56);
            pdf.text("Resumen de Agrupación", marginX, y);
            y += 5;
            pdf.setFillColor(234, 242, 250);
            pdf.rect(marginX, y, contentWidth, 7, "F");
            pdf.setFontSize(9);
            pdf.setTextColor(67, 84, 106);
            pdf.text("Grupo", marginX + 2, y + 4.8);
            pdf.text("Tickets", marginX + contentWidth - 2, y + 4.8, { align: "right" });
            y += 7;

            groupedRows.slice(0, 24).forEach((row, idx) => {
                ensureSpace(6.8);
                if (idx % 2 === 1) {
                    pdf.setFillColor(248, 251, 255);
                    pdf.rect(marginX, y, contentWidth, 6.5, "F");
                }
                pdf.setTextColor(45, 62, 80);
                pdf.text(row.label.slice(0, 72), marginX + 2, y + 4.4);
                pdf.text(String(row.tickets), marginX + contentWidth - 2, y + 4.4, { align: "right" });
                y += 6.5;
            });

            y += 4;
            ensureSpace(14);
            pdf.setFontSize(11);
            pdf.setTextColor(28, 40, 56);
            pdf.text("Detalle de Tickets", marginX, y);
            y += 5;

            // Detail table header
            const colX = {
                date: marginX + 2,
                client: marginX + 26,
                assignee: marginX + 82,
                ticket: marginX + 132,
                right: marginX + contentWidth - 2,
            };
            pdf.setFillColor(234, 242, 250);
            pdf.rect(marginX, y, contentWidth, 7, "F");
            pdf.setFontSize(8.5);
            pdf.setTextColor(67, 84, 106);
            pdf.text("Fecha", colX.date, y + 4.8);
            pdf.text("Cliente", colX.client, y + 4.8);
            pdf.text("Asignado", colX.assignee, y + 4.8);
            pdf.text("Ticket", colX.ticket, y + 4.8);
            y += 7;

            filteredLines.slice(0, 60).forEach((line, idx) => {
                ensureSpace(7);
                if (idx % 2 === 1) {
                    pdf.setFillColor(248, 251, 255);
                    pdf.rect(marginX, y, contentWidth, 6.6, "F");
                }
                const assignees = line.assignees.length > 0 ? line.assignees.join(", ") : "Sin asignado";
                pdf.setTextColor(45, 62, 80);
                pdf.text(line.closedDate, colX.date, y + 4.5);
                pdf.text(line.client.slice(0, 28), colX.client, y + 4.5);
                pdf.text(assignees.slice(0, 24), colX.assignee, y + 4.5);
                pdf.text(line.name.slice(0, 42), colX.ticket, y + 4.5);
                y += 6.6;
            });

            addPdfPageNumbers(pdf);
            pdf.save(`Customer_Success_Tickets_${new Date().toISOString().split("T")[0]}.pdf`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error exportando PDF");
        } finally {
            setExportingPdf(false);
        }
    };

    const handleDebug = async () => {
        setDebugLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/reports/clickup-closed-tickets/debug");
            const payload = await res.json();
            if (!res.ok) {
                setError(payload.error || "Error obteniendo diagnóstico");
                setDebugPayload(null);
                return;
            }
            setDebugPayload(payload);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error de conexión al diagnóstico");
            setDebugPayload(null);
        } finally {
            setDebugLoading(false);
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
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={handleQuery}
                                disabled={loading}
                                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-nearby-dark rounded-xl hover:bg-nearby-dark-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                {loading ? "Consultando ClickUp..." : "Consultar"}
                            </button>
                            <button
                                onClick={handleDebug}
                                disabled={debugLoading}
                                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[var(--foreground)] border border-[var(--card-border)] rounded-xl bg-[var(--surface-0)] hover:bg-[var(--hover-bg)] transition-colors disabled:opacity-50"
                            >
                                {debugLoading ? <Loader2 size={16} className="animate-spin" /> : <Bug size={16} />}
                                {debugLoading ? "Leyendo debug..." : "Diagnóstico ClickUp"}
                            </button>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-error-red/10 text-error-red text-sm">{error}</div>
                )}

                {debugPayload && (
                    <div className="mb-4 bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-4">
                        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-2">Diagnóstico ClickUp (raw)</h3>
                        <pre className="max-h-[420px] overflow-auto text-xs p-3 rounded-lg bg-[var(--surface-0)] border border-[var(--card-border)] text-[var(--foreground)] whitespace-pre-wrap">
                            {JSON.stringify(debugPayload, null, 2)}
                        </pre>
                    </div>
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
                                        <Bar dataKey="tickets" fill="#FC5A34" radius={[6, 6, 0, 0]} />
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
