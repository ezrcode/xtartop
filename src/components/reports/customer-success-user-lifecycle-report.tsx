"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, LineChart as LineChartIcon, Loader2, Search } from "lucide-react";
import * as XLSX from "xlsx";
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
    userName: string;
    eventType: "ACTIVATED" | "DEACTIVATED";
    source: "CREATE" | "STATUS_CHANGE";
}

interface ActiveNowByCompany {
    companyId: string;
    companyName: string;
    activeUsers: number;
}

interface ReportResponse {
    events: LifecycleEvent[];
    activeNowByCompany: ActiveNowByCompany[];
    activeNowTotal: number;
    range: { from: string; to: string };
}

function formatDateForInput(date: Date): string {
    return date.toISOString().split("T")[0];
}

export function CustomerSuccessUserLifecycleReport() {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [dateFrom, setDateFrom] = useState(formatDateForInput(firstOfMonth));
    const [dateTo, setDateTo] = useState(formatDateForInput(now));
    const [companyFilter, setCompanyFilter] = useState("all");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasQueried, setHasQueried] = useState(false);
    const [data, setData] = useState<ReportResponse | null>(null);

    const companies = useMemo(() => {
        const list = data?.activeNowByCompany || [];
        return list.filter((row) => row.companyName).sort((a, b) => a.companyName.localeCompare(b.companyName, "es"));
    }, [data]);

    const filteredEvents = useMemo(() => {
        if (!data) return [];
        if (companyFilter === "all") return data.events;
        return data.events.filter((event) => event.companyId === companyFilter);
    }, [data, companyFilter]);

    const timelineRows = useMemo(() => {
        const map = new Map<string, { weekLabel: string; activated: number; deactivated: number; net: number }>();

        for (const event of filteredEvents) {
            const key = event.weekLabel;
            if (!map.has(key)) {
                map.set(key, { weekLabel: key, activated: 0, deactivated: 0, net: 0 });
            }
            const row = map.get(key)!;
            if (event.eventType === "ACTIVATED") row.activated += 1;
            if (event.eventType === "DEACTIVATED") row.deactivated += 1;
            row.net = row.activated - row.deactivated;
        }

        return Array.from(map.values());
    }, [filteredEvents]);

    const summaryByCompany = useMemo(() => {
        if (!data) return [];

        const counter = new Map<string, { companyId: string; companyName: string; activated: number; deactivated: number }>();

        for (const row of data.activeNowByCompany) {
            counter.set(row.companyId, {
                companyId: row.companyId,
                companyName: row.companyName,
                activated: 0,
                deactivated: 0,
            });
        }

        for (const event of data.events) {
            const row = counter.get(event.companyId) || {
                companyId: event.companyId,
                companyName: event.companyName,
                activated: 0,
                deactivated: 0,
            };

            if (event.eventType === "ACTIVATED") row.activated += 1;
            if (event.eventType === "DEACTIVATED") row.deactivated += 1;
            counter.set(event.companyId, row);
        }

        let rows = Array.from(counter.values()).map((row) => {
            const activeCurrent = data.activeNowByCompany.find((x) => x.companyId === row.companyId)?.activeUsers || 0;
            return {
                ...row,
                activeCurrent,
                net: row.activated - row.deactivated,
            };
        });

        if (companyFilter !== "all") {
            rows = rows.filter((row) => row.companyId === companyFilter);
        }

        return rows.sort((a, b) => a.companyName.localeCompare(b.companyName, "es"));
    }, [data, companyFilter]);

    const totals = useMemo(() => {
        const activated = filteredEvents.filter((event) => event.eventType === "ACTIVATED").length;
        const deactivated = filteredEvents.filter((event) => event.eventType === "DEACTIVATED").length;
        const activeNow = companyFilter === "all"
            ? (data?.activeNowTotal || 0)
            : (data?.activeNowByCompany.find((row) => row.companyId === companyFilter)?.activeUsers || 0);

        return { activated, deactivated, activeNow };
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

    const handleExportExcel = () => {
        if (!data) return;

        const wb = XLSX.utils.book_new();

        const summarySheet = XLSX.utils.json_to_sheet(
            summaryByCompany.map((row) => ({
                Cliente: row.companyName,
                Activaciones: row.activated,
                Desactivaciones: row.deactivated,
                "Activos actuales": row.activeCurrent,
                "Balance neto": row.net,
            }))
        );
        XLSX.utils.book_append_sheet(wb, summarySheet, "Resumen");

        const timelineSheet = XLSX.utils.json_to_sheet(
            timelineRows.map((row) => ({
                Semana: row.weekLabel,
                Activaciones: row.activated,
                Desactivaciones: row.deactivated,
                "Balance neto": row.net,
            }))
        );
        XLSX.utils.book_append_sheet(wb, timelineSheet, "Timeline");

        const eventsSheet = XLSX.utils.json_to_sheet(
            filteredEvents.map((event) => ({
                Fecha: event.dateLabel,
                Cliente: event.companyName,
                Usuario: event.userName,
                Evento: event.eventType === "ACTIVATED" ? "Activación" : "Desactivación",
                Fuente: event.source === "CREATE" ? "Creación de usuario" : "Cambio de estado",
            }))
        );
        XLSX.utils.book_append_sheet(wb, eventsSheet, "Eventos");

        XLSX.writeFile(wb, `Customer_Success_Activacion_Usuarios_${new Date().toISOString().split("T")[0]}.xlsx`);
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
                                    Activación de Usuarios
                                </h1>
                                <p className="text-sm text-[var(--muted-text)] mt-0.5">
                                    Customer Success - altas, bajas y activos actuales por cliente
                                </p>
                            </div>
                        </div>

                        {hasQueried && data && (
                            <button
                                onClick={handleExportExcel}
                                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-ocean-blue rounded-xl hover:bg-ocean-blue/90 transition-colors shadow-sm"
                            >
                                <Download size={16} />
                                Exportar Excel
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
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-gradient-to-br from-success-green/10 to-success-green/5 rounded-xl border border-success-green/20 p-4">
                                <p className="text-xs text-[var(--muted-text)] uppercase tracking-wider">Activaciones</p>
                                <p className="text-2xl font-bold text-[var(--foreground)] mt-1">{totals.activated}</p>
                            </div>
                            <div className="bg-gradient-to-br from-nearby-accent/10 to-nearby-accent/5 rounded-xl border border-nearby-accent/20 p-4">
                                <p className="text-xs text-[var(--muted-text)] uppercase tracking-wider">Desactivaciones</p>
                                <p className="text-2xl font-bold text-[var(--foreground)] mt-1">{totals.deactivated}</p>
                            </div>
                            <div className="bg-gradient-to-br from-ocean-blue/10 to-ocean-blue/5 rounded-xl border border-ocean-blue/20 p-4">
                                <p className="text-xs text-[var(--muted-text)] uppercase tracking-wider">Activos actuales</p>
                                <p className="text-2xl font-bold text-[var(--foreground)] mt-1">{totals.activeNow}</p>
                            </div>
                        </div>

                        <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] p-4 sm:p-5">
                            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Línea de tiempo semanal</h3>
                            <div className="h-[320px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={timelineRows}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                                        <XAxis dataKey="weekLabel" tick={{ fill: "var(--muted-text)", fontSize: 11 }} />
                                        <YAxis allowDecimals={false} tick={{ fill: "var(--muted-text)", fontSize: 12 }} />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="activated" name="Activaciones" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3 }} />
                                        <Line type="monotone" dataKey="deactivated" name="Desactivaciones" stroke="#FC5A34" strokeWidth={2.5} dot={{ r: 3 }} />
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
                                            <th className="text-right px-4 py-2 text-xs text-[var(--muted-text)] uppercase">Activaciones</th>
                                            <th className="text-right px-4 py-2 text-xs text-[var(--muted-text)] uppercase">Desactivaciones</th>
                                            <th className="text-right px-4 py-2 text-xs text-[var(--muted-text)] uppercase">Activos actuales</th>
                                            <th className="text-right px-4 py-2 text-xs text-[var(--muted-text)] uppercase">Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--card-border)]">
                                        {summaryByCompany.map((row) => (
                                            <tr key={row.companyId}>
                                                <td className="px-4 py-2 text-[var(--foreground)]">{row.companyName}</td>
                                                <td className="px-4 py-2 text-right text-success-green font-semibold">{row.activated}</td>
                                                <td className="px-4 py-2 text-right text-nearby-accent font-semibold">{row.deactivated}</td>
                                                <td className="px-4 py-2 text-right text-[var(--foreground)] font-semibold">{row.activeCurrent}</td>
                                                <td className="px-4 py-2 text-right text-[var(--foreground)] font-semibold">{row.net}</td>
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
