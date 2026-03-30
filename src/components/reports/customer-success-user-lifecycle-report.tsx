"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, LineChart as LineChartIcon, Loader2, Search } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

interface LifecycleEvent {
    id: string;
    date: string;
    dateLabel: string;
    weekLabel: string;
    companyId: string;
    companyName: string;
    itemName: string;
    eventType: "ACTIVATED" | "DEACTIVATED";
    entityType: "USER" | "PROJECT";
    source: "CREATE" | "STATUS_CHANGE";
}

interface ActiveNowByCompany {
    companyId: string;
    companyName: string;
    activeUsers: number;
}

interface CompanySummaryRow {
    companyId: string;
    companyName: string;
    activated: number;
    deactivated: number;
    activeAtStart: number;
    activeAtEnd: number;
    activeCurrent: number;
    net: number;
}

interface ReportResponse {
    events: LifecycleEvent[];
    projectEvents: LifecycleEvent[];
    activeNowByCompany: ActiveNowByCompany[];
    activeNowTotal: number;
    activeStartTotal: number;
    activeEndTotal: number;
    companySummary: CompanySummaryRow[];
    projectSummary: CompanySummaryRow[];
    range: { from: string; to: string };
}

function formatDateForInput(date: Date): string {
    return date.toISOString().split("T")[0];
}

function getMonthKey(dateStr: string): string {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
}

function getMonthLabel(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-DO", { month: "short", year: "numeric" });
}

export function CustomerSuccessUserLifecycleReport() {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [dateFrom, setDateFrom] = useState(formatDateForInput(firstOfMonth));
    const [dateTo, setDateTo] = useState(formatDateForInput(now));
    const [companyFilter, setCompanyFilter] = useState("all");
    const [loading, setLoading] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasQueried, setHasQueried] = useState(false);
    const [data, setData] = useState<ReportResponse | null>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);

    const companies = useMemo(() => {
        const list = data?.activeNowByCompany || [];
        return list.filter((row) => row.companyName).sort((a, b) => a.companyName.localeCompare(b.companyName, "es"));
    }, [data]);

    const filteredEvents = useMemo(() => {
        if (!data) return [];
        if (companyFilter === "all") return data.events;
        return data.events.filter((event) => event.companyId === companyFilter);
    }, [data, companyFilter]);

    const filteredProjectEvents = useMemo(() => {
        if (!data) return [];
        if (companyFilter === "all") return data.projectEvents;
        return data.projectEvents.filter((event) => event.companyId === companyFilter);
    }, [data, companyFilter]);

    const timelineRows = useMemo(() => {
        const map = new Map<string, { monthKey: string; monthLabel: string; activated: number; deactivated: number; projectActivated: number; projectDeactivated: number }>();

        for (const event of filteredEvents) {
            const key = getMonthKey(event.date);
            if (!map.has(key)) {
                map.set(key, { monthKey: key, monthLabel: getMonthLabel(event.date), activated: 0, deactivated: 0, projectActivated: 0, projectDeactivated: 0 });
            }
            const row = map.get(key)!;
            if (event.eventType === "ACTIVATED") row.activated += 1;
            if (event.eventType === "DEACTIVATED") row.deactivated += 1;
        }

        for (const event of filteredProjectEvents) {
            const key = getMonthKey(event.date);
            if (!map.has(key)) {
                map.set(key, { monthKey: key, monthLabel: getMonthLabel(event.date), activated: 0, deactivated: 0, projectActivated: 0, projectDeactivated: 0 });
            }
            const row = map.get(key)!;
            if (event.eventType === "ACTIVATED") row.projectActivated += 1;
            if (event.eventType === "DEACTIVATED") row.projectDeactivated += 1;
        }

        return Array.from(map.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    }, [filteredEvents, filteredProjectEvents]);

    const summaryByCompany = useMemo(() => {
        if (!data) return [];
        let rows = [...data.companySummary];

        if (companyFilter !== "all") {
            rows = rows.filter((row) => row.companyId === companyFilter);
        }

        return rows.sort((a, b) => a.companyName.localeCompare(b.companyName, "es"));
    }, [data, companyFilter]);

    const projectSummaryByCompany = useMemo(() => {
        if (!data) return [];
        let rows = [...data.projectSummary];

        if (companyFilter !== "all") {
            rows = rows.filter((row) => row.companyId === companyFilter);
        }

        return rows.sort((a, b) => a.companyName.localeCompare(b.companyName, "es"));
    }, [data, companyFilter]);

    const totals = useMemo(() => {
        const activated = filteredEvents.filter((event) => event.eventType === "ACTIVATED").length;
        const deactivated = filteredEvents.filter((event) => event.eventType === "DEACTIVATED").length;
        const activeStart = companyFilter === "all"
            ? (data?.activeStartTotal || 0)
            : (data?.companySummary.find((row) => row.companyId === companyFilter)?.activeAtStart || 0);
        const activeEnd = companyFilter === "all"
            ? (data?.activeEndTotal || 0)
            : (data?.companySummary.find((row) => row.companyId === companyFilter)?.activeAtEnd || 0);
        const activeNow = companyFilter === "all"
            ? (data?.activeNowTotal || 0)
            : (data?.activeNowByCompany.find((row) => row.companyId === companyFilter)?.activeUsers || 0);

        return { activated, deactivated, activeStart, activeEnd, activeNow };
    }, [filteredEvents, data, companyFilter]);

    const handleQuery = async () => {
        setLoading(true);
        setHasQueried(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            params.set("dateFrom", dateFrom);
            params.set("dateTo", dateTo);
            const res = await fetch(`/api/reports/customer-success-user-lifecycle?${params.toString()}`);
            const json = await res.json();

            if (!res.ok) {
                setError(json.error || "Error consultando reporte");
                setData(null);
                return;
            }

            setData(json);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error de conexión");
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleExportPdf = async () => {
        if (!data) return;
        setExportingPdf(true);
        setError(null);

        try {
            const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const pageWidth = 210;
            const marginX = 14;
            const contentWidth = pageWidth - marginX * 2;
            let y = 16;

            pdf.setFillColor(252, 90, 52);
            pdf.rect(0, 0, pageWidth, 5, "F");

            pdf.setTextColor(28, 40, 56);
            pdf.setFontSize(16);
            pdf.text("Reporte Ejecutivo - Activación de licencias", marginX, y);
            y += 6;
            pdf.setFontSize(10);
            pdf.setTextColor(95, 110, 130);
            const companyName = companyFilter === "all"
                ? "Todos los clientes"
                : (companies.find((company) => company.companyId === companyFilter)?.companyName || "Cliente");
            pdf.text(`Rango: ${dateFrom} a ${dateTo}`, marginX, y);
            y += 5;
            pdf.text(`Cliente: ${companyName}`, marginX, y);
            y += 5;
            pdf.text(`Generado: ${new Date().toLocaleString("es-DO")}`, marginX, y);
            y += 8;

            pdf.setFillColor(247, 250, 253);
            pdf.roundedRect(marginX, y, contentWidth, 18, 2, 2, "F");
            pdf.setDrawColor(220, 227, 236);
            pdf.roundedRect(marginX, y, contentWidth, 18, 2, 2);
            pdf.setTextColor(28, 40, 56);
            pdf.setFontSize(10);
            pdf.text(`Activaciones: ${totals.activated}`, marginX + 4, y + 6);
            pdf.text(`Desactivaciones: ${totals.deactivated}`, marginX + 4, y + 12);
            pdf.text(`Activos al inicio: ${totals.activeStart}`, marginX + 90, y + 6);
            pdf.text(`Activos al cierre: ${totals.activeEnd}`, marginX + 90, y + 12);
            y += 24;

            if (chartContainerRef.current) {
                const canvas = await html2canvas(chartContainerRef.current, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: "#ffffff",
                });
                const imgData = canvas.toDataURL("image/png");
                const imgWidth = contentWidth;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                const drawHeight = Math.min(imgHeight, 95);
                pdf.setFontSize(11);
                pdf.setTextColor(28, 40, 56);
                pdf.text("Línea de tiempo mensual", marginX, y);
                y += 3;
                pdf.setDrawColor(220, 227, 236);
                pdf.roundedRect(marginX, y, contentWidth, drawHeight + 4, 2, 2);
                pdf.addImage(imgData, "PNG", marginX + 2, y + 2, contentWidth - 4, drawHeight);
                y += drawHeight + 10;
            }

            const ensureSpace = (needed: number) => {
                if (y + needed > 280) {
                    pdf.addPage();
                    y = 16;
                }
            };

            ensureSpace(14);
            pdf.setFontSize(11);
            pdf.setTextColor(28, 40, 56);
            pdf.text("Resumen por cliente", marginX, y);
            y += 5;

            pdf.setFillColor(234, 242, 250);
            pdf.rect(marginX, y, contentWidth, 7, "F");
            pdf.setFontSize(8.5);
            pdf.setTextColor(67, 84, 106);
            pdf.text("Cliente", marginX + 2, y + 4.8);
            pdf.text("Inicio", marginX + 106, y + 4.8, { align: "right" });
            pdf.text("Act.", marginX + 124, y + 4.8, { align: "right" });
            pdf.text("Des.", marginX + 140, y + 4.8, { align: "right" });
            pdf.text("Cierre", marginX + 158, y + 4.8, { align: "right" });
            pdf.text("Actual", marginX + 176, y + 4.8, { align: "right" });
            pdf.text("Bal.", marginX + contentWidth - 2, y + 4.8, { align: "right" });
            y += 7;

            summaryByCompany.slice(0, 30).forEach((row, index) => {
                ensureSpace(6.8);
                if (index % 2 === 1) {
                    pdf.setFillColor(248, 251, 255);
                    pdf.rect(marginX, y, contentWidth, 6.5, "F");
                }
                pdf.setTextColor(45, 62, 80);
                pdf.text(row.companyName.slice(0, 42), marginX + 2, y + 4.4);
                pdf.text(String(row.activeAtStart), marginX + 106, y + 4.4, { align: "right" });
                pdf.text(String(row.activated), marginX + 124, y + 4.4, { align: "right" });
                pdf.text(String(row.deactivated), marginX + 140, y + 4.4, { align: "right" });
                pdf.text(String(row.activeAtEnd), marginX + 158, y + 4.4, { align: "right" });
                y += 6.5;
            });

            y += 6;
            ensureSpace(14);
            pdf.setFontSize(11);
            pdf.setTextColor(28, 40, 56);
            pdf.text("Resumen por cliente - Proyectos", marginX, y);
            y += 5;

            pdf.setFillColor(234, 242, 250);
            pdf.rect(marginX, y, contentWidth, 7, "F");
            pdf.setFontSize(8.5);
            pdf.setTextColor(67, 84, 106);
            pdf.text("Cliente", marginX + 2, y + 4.8);
            pdf.text("Inicio", marginX + 124, y + 4.8, { align: "right" });
            pdf.text("Act.", marginX + 142, y + 4.8, { align: "right" });
            pdf.text("Des.", marginX + 158, y + 4.8, { align: "right" });
            pdf.text("Cierre", marginX + contentWidth - 2, y + 4.8, { align: "right" });
            y += 7;

            projectSummaryByCompany.slice(0, 30).forEach((row, index) => {
                ensureSpace(6.8);
                if (index % 2 === 1) {
                    pdf.setFillColor(248, 251, 255);
                    pdf.rect(marginX, y, contentWidth, 6.5, "F");
                }
                pdf.setTextColor(45, 62, 80);
                pdf.text(row.companyName.slice(0, 54), marginX + 2, y + 4.4);
                pdf.text(String(row.activeAtStart), marginX + 124, y + 4.4, { align: "right" });
                pdf.text(String(row.activated), marginX + 142, y + 4.4, { align: "right" });
                pdf.text(String(row.deactivated), marginX + 158, y + 4.4, { align: "right" });
                pdf.text(String(row.activeAtEnd), marginX + contentWidth - 2, y + 4.4, { align: "right" });
                y += 6.5;
            });

            pdf.save(`Customer_Success_Activacion_Usuarios_${new Date().toISOString().split("T")[0]}.pdf`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error exportando PDF");
        } finally {
            setExportingPdf(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--surface-0)] py-6 sm:py-8">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] p-4 sm:p-6 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Link
                                href="/app/reports"
                                className="h-10 w-10 rounded-xl bg-[var(--hover-bg)] flex items-center justify-center hover:bg-[var(--card-border)] transition-colors"
                            >
                                <ArrowLeft size={18} className="text-[var(--muted-text)]" />
                            </Link>
                            <div className="hidden sm:flex h-10 w-10 rounded-xl bg-ocean-blue/15 items-center justify-center">
                                <LineChartIcon size={20} className="text-ocean-blue" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">
                                    Activación de licencias
                                </h1>
                                <p className="text-sm text-[var(--muted-text)] mt-0.5">
                                    Customer Success - evolución de usuarios y proyectos por cliente
                                </p>
                            </div>
                        </div>

                        {hasQueried && data && (
                            <button
                                onClick={handleExportPdf}
                                disabled={exportingPdf}
                                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-ocean-blue rounded-xl hover:bg-ocean-blue/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {exportingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                {exportingPdf ? "Generando PDF..." : "Exportar PDF"}
                            </button>
                        )}
                    </div>
                </div>

                <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] p-4 sm:p-5 mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider mb-2">Desde</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--card-border)] bg-[var(--surface-0)] text-[var(--foreground)]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider mb-2">Hasta</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--card-border)] bg-[var(--surface-0)] text-[var(--foreground)]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider mb-2">Cliente</label>
                            <select
                                value={companyFilter}
                                onChange={(e) => setCompanyFilter(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--card-border)] bg-[var(--surface-0)] text-[var(--foreground)]"
                            >
                                <option value="all">Todos</option>
                                {companies.map((company) => (
                                    <option key={company.companyId} value={company.companyId}>
                                        {company.companyName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={handleQuery}
                                disabled={loading}
                                className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-white bg-nearby-dark rounded-xl hover:bg-nearby-dark-600 transition-colors disabled:opacity-50"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                {loading ? "Consultando..." : "Consultar"}
                            </button>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-error-red/10 text-error-red text-sm">{error}</div>
                )}

                {hasQueried && data && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-gradient-to-br from-success-green/10 to-success-green/5 rounded-xl border border-success-green/20 p-4">
                                <p className="text-xs text-[var(--muted-text)] uppercase tracking-wider">Activaciones</p>
                                <p className="text-2xl font-bold text-[var(--foreground)] mt-1">{totals.activated}</p>
                            </div>
                            <div className="bg-gradient-to-br from-nearby-accent/10 to-nearby-accent/5 rounded-xl border border-nearby-accent/20 p-4">
                                <p className="text-xs text-[var(--muted-text)] uppercase tracking-wider">Desactivaciones</p>
                                <p className="text-2xl font-bold text-[var(--foreground)] mt-1">{totals.deactivated}</p>
                            </div>
                            <div className="bg-gradient-to-br from-ocean-blue/10 to-ocean-blue/5 rounded-xl border border-ocean-blue/20 p-4">
                                <p className="text-xs text-[var(--muted-text)] uppercase tracking-wider">Activos al inicio</p>
                                <p className="text-2xl font-bold text-[var(--foreground)] mt-1">{totals.activeStart}</p>
                            </div>
                            <div className="bg-gradient-to-br from-info-blue/10 to-info-blue/5 rounded-xl border border-info-blue/20 p-4">
                                <p className="text-xs text-[var(--muted-text)] uppercase tracking-wider">Activos al cierre</p>
                                <p className="text-2xl font-bold text-[var(--foreground)] mt-1">{totals.activeEnd}</p>
                            </div>
                        </div>

                        <div ref={chartContainerRef} className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] p-4 sm:p-5">
                            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Línea de tiempo mensual</h3>
                            <div className="h-[320px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={timelineRows}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                                        <XAxis dataKey="monthLabel" tick={{ fill: "var(--muted-text)", fontSize: 11 }} />
                                        <YAxis allowDecimals={false} tick={{ fill: "var(--muted-text)", fontSize: 12 }} />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="activated" name="Usuarios activados" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3 }} />
                                        <Line type="monotone" dataKey="deactivated" name="Usuarios desactivados" stroke="#FC5A34" strokeWidth={2.5} dot={{ r: 3 }} />
                                        <Line type="monotone" dataKey="projectActivated" name="Proyectos activados" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                                        <Line type="monotone" dataKey="projectDeactivated" name="Proyectos desactivados" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] overflow-hidden">
                            <div className="px-4 py-3 border-b border-[var(--card-border)] bg-[var(--hover-bg)]">
                                <h3 className="text-sm font-semibold text-[var(--foreground)]">Resumen por cliente</h3>
                            </div>
                            <div className="max-h-96 overflow-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-[var(--surface-2)]">
                                        <tr>
                                            <th className="text-left px-4 py-2 text-xs text-[var(--muted-text)] uppercase">Cliente</th>
                                            <th className="text-right px-4 py-2 text-xs text-[var(--muted-text)] uppercase">Activos al inicio</th>
                                            <th className="text-right px-4 py-2 text-xs text-[var(--muted-text)] uppercase">Activaciones</th>
                                            <th className="text-right px-4 py-2 text-xs text-[var(--muted-text)] uppercase">Desactivaciones</th>
                                            <th className="text-right px-4 py-2 text-xs text-[var(--muted-text)] uppercase">Activos al cierre</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--card-border)]">
                                        {summaryByCompany.map((row) => (
                                            <tr key={row.companyId}>
                                                <td className="px-4 py-2 text-[var(--foreground)]">{row.companyName}</td>
                                                <td className="px-4 py-2 text-right text-[var(--foreground)] font-semibold">{row.activeAtStart}</td>
                                                <td className="px-4 py-2 text-right text-success-green font-semibold">{row.activated}</td>
                                                <td className="px-4 py-2 text-right text-nearby-accent font-semibold">{row.deactivated}</td>
                                                <td className="px-4 py-2 text-right text-[var(--foreground)] font-semibold">{row.activeAtEnd}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] overflow-hidden">
                            <div className="px-4 py-3 border-b border-[var(--card-border)] bg-[var(--hover-bg)]">
                                <h3 className="text-sm font-semibold text-[var(--foreground)]">Resumen por cliente - Proyectos</h3>
                            </div>
                            <div className="max-h-96 overflow-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-[var(--surface-2)]">
                                        <tr>
                                            <th className="text-left px-4 py-2 text-xs text-[var(--muted-text)] uppercase">Cliente</th>
                                            <th className="text-right px-4 py-2 text-xs text-[var(--muted-text)] uppercase">Activos al inicio</th>
                                            <th className="text-right px-4 py-2 text-xs text-[var(--muted-text)] uppercase">Activaciones</th>
                                            <th className="text-right px-4 py-2 text-xs text-[var(--muted-text)] uppercase">Desactivaciones</th>
                                            <th className="text-right px-4 py-2 text-xs text-[var(--muted-text)] uppercase">Activos al cierre</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--card-border)]">
                                        {projectSummaryByCompany.map((row) => (
                                            <tr key={`project-${row.companyId}`}>
                                                <td className="px-4 py-2 text-[var(--foreground)]">{row.companyName}</td>
                                                <td className="px-4 py-2 text-right text-[var(--foreground)] font-semibold">{row.activeAtStart}</td>
                                                <td className="px-4 py-2 text-right text-info-blue font-semibold">{row.activated}</td>
                                                <td className="px-4 py-2 text-right text-amber-500 font-semibold">{row.deactivated}</td>
                                                <td className="px-4 py-2 text-right text-[var(--foreground)] font-semibold">{row.activeAtEnd}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {hasQueried && !loading && data && summaryByCompany.length === 0 && (
                    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-12 text-center">
                        <p className="text-sm text-[var(--muted-text)]">No se encontraron eventos en el rango seleccionado.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
