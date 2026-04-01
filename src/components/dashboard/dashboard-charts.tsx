"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import { TrendingUp } from "lucide-react";
import Link from "next/link";

interface PipelineItem {
    status: string;
    label: string;
    count: number;
    value: number;
}

interface DashboardChartsProps {
    pipeline: PipelineItem[];
}

const STATUS_COLORS: Record<string, string> = {
    PROSPECCION: "#94a3b8",
    CALIFICACION: "#3B82F6",
    NEGOCIACION: "#D97706",
    FORMALIZACION: "#8B5CF6",
    CIERRE_GANADO: "#1BC47D",
    CIERRE_PERDIDO: "#FF4E4E",
    NO_CALIFICADOS: "#6B7280",
};

const formatCurrency = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
};

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: PipelineItem }> }) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-lg px-3 py-2 text-xs">
            <p className="font-semibold text-[var(--foreground)] mb-1">{d.label}</p>
            <p className="text-[var(--muted-text)]">
                {d.count} negocio{d.count !== 1 ? "s" : ""} · {formatCurrency(d.value)}
            </p>
        </div>
    );
}

export function DashboardCharts({ pipeline }: DashboardChartsProps) {
    const visible = pipeline.filter((d) => d.count > 0);
    const totalDeals = pipeline.reduce((s, d) => s + d.count, 0);
    const totalValue = pipeline.reduce((s, d) => s + d.value, 0);

    if (visible.length === 0) {
        return (
            <div className="bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)] p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">Pipeline de Negocios</h3>
                    <TrendingUp size={18} className="text-[var(--muted-text)]" />
                </div>
                <div className="flex items-center justify-center h-48 text-[var(--muted-text)] text-sm">
                    No hay negocios registrados
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)] p-5">
            <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Pipeline de Negocios</h3>
                <Link
                    href="/app/deals"
                    className="text-xs text-[var(--foreground)] font-medium hover:underline py-1 px-2 -mr-2 rounded-lg active:bg-nearby-dark/8 dark:active:bg-nearby-dark-300/10"
                >
                    Ver todos
                </Link>
            </div>

            <div className="flex items-baseline gap-2 mb-5">
                <span className="text-2xl font-bold text-[var(--foreground)]">{totalDeals}</span>
                <span className="text-sm text-[var(--muted-text)]">
                    negocios · {formatCurrency(totalValue)}
                </span>
            </div>

            <ResponsiveContainer width="100%" height={visible.length * 52 + 24}>
                <BarChart
                    data={visible}
                    layout="vertical"
                    margin={{ top: 0, right: 24, bottom: 0, left: 0 }}
                    barCategoryGap="20%"
                >
                    <XAxis type="number" hide />
                    <YAxis
                        type="category"
                        dataKey="label"
                        width={110}
                        tick={{ fontSize: 12, fill: "var(--muted-text)" }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ fill: "var(--hover-bg)", radius: 6 }}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
                        {visible.map((entry) => (
                            <Cell
                                key={entry.status}
                                fill={STATUS_COLORS[entry.status] ?? "#6B7280"}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
                {visible.map((d) => (
                    <div key={d.status} className="flex items-center gap-1.5 text-[11px] text-[var(--muted-text)]">
                        <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ backgroundColor: STATUS_COLORS[d.status] ?? "#6B7280" }}
                        />
                        {d.label}
                    </div>
                ))}
            </div>
        </div>
    );
}
