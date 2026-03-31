"use client";

import { TrendingUp } from "lucide-react";
import Link from "next/link";

interface DealsByStage {
    stage: string;
    label: string;
    count: number;
    value: number;
}

interface DealsPipelineProps {
    data: DealsByStage[];
}

const stageColors: Record<string, { bg: string; bar: string }> = {
    PROSPECCION: { bg: "bg-slate-400/10", bar: "bg-slate-400" },
    CALIFICACION: { bg: "bg-blue-400/10", bar: "bg-blue-400" },
    NEGOCIACION: { bg: "bg-amber-400/10", bar: "bg-amber-400" },
    FORMALIZACION: { bg: "bg-purple-400/10", bar: "bg-purple-400" },
    CIERRE_GANADO: { bg: "bg-success-green/10", bar: "bg-success-green" },
    CIERRE_PERDIDO: { bg: "bg-error-red/10", bar: "bg-error-red" },
    NO_CALIFICADOS: { bg: "bg-nearby-dark-300/10", bar: "bg-nearby-dark-300" },
};

const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
};

export function DealsPipeline({ data }: DealsPipelineProps) {
    const totalValue = data.reduce((acc, d) => acc + d.value, 0);
    const totalDeals = data.reduce((acc, d) => acc + d.count, 0);
    const maxCount = Math.max(...data.map(d => d.count), 1);
    const filteredData = data.filter(d => d.count > 0);

    if (filteredData.length === 0) {
        return (
            <div className="bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)] p-4 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">Pipeline de Negocios</h3>
                    <TrendingUp size={18} className="text-[var(--muted-text)]" />
                </div>
                <div className="flex items-center justify-center h-40 sm:h-48 text-[var(--muted-text)] text-sm">
                    No hay negocios registrados
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Pipeline de Negocios</h3>
                <Link 
                    href="/app/deals" 
                    className="text-xs text-nearby-accent hover:underline py-1 px-2 -mr-2 rounded-lg active:bg-nearby-accent/10"
                >
                    Ver todos
                </Link>
            </div>
            
            <div className="flex items-baseline gap-2 mb-4">
                <span className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">{totalDeals}</span>
                <span className="text-xs sm:text-sm text-[var(--muted-text)]">negocios · <span className="font-mono tabular-nums">{formatCurrency(totalValue)}</span></span>
            </div>

            <div className="space-y-2.5">
                {filteredData.map((stage, idx) => {
                    const colors = stageColors[stage.stage] || stageColors.NO_CALIFICADOS;
                    const pct = Math.round((stage.count / maxCount) * 100);
                    const convRate = idx > 0 && filteredData[idx - 1].count > 0
                        ? Math.round((stage.count / filteredData[idx - 1].count) * 100)
                        : null;
                    
                    return (
                        <div key={stage.stage} className={`flex items-center gap-3 p-2 rounded-lg ${colors.bg}`}>
                            <span className="text-[10px] sm:text-xs text-[var(--muted-text)] w-24 truncate font-medium">{stage.label}</span>
                            <div className="flex-1 h-4 bg-[var(--hover-bg)] rounded-full overflow-hidden">
                                <div 
                                    className={`h-full ${colors.bar} rounded-full transition-all duration-700 ease-out`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-semibold text-[var(--foreground)] w-5 text-right">{stage.count}</span>
                                {convRate !== null && (
                                    <span className="text-[9px] text-[var(--muted-text)] w-8 text-right">{convRate}%</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
