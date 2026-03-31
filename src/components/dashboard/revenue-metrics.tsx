"use client";

import { DollarSign, Calendar, TrendingUp } from "lucide-react";

interface RevenueMetricsProps {
    mrr: number;
    arr: number;
    pipelineValue: number;
    wonValue: number;
}

const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
};

export function RevenueMetrics({ mrr, arr, pipelineValue, wonValue }: RevenueMetricsProps) {
    return (
        <div className="bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Ingresos</h3>
                <DollarSign size={18} className="text-[var(--muted-text)]" />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="p-2.5 sm:p-3 bg-info-blue/10 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-1">
                        <Calendar size={12} className="text-ocean-blue" />
                        <span className="text-[10px] font-medium text-ocean-blue uppercase tracking-wide">MRR</span>
                    </div>
                    <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-[var(--foreground)]">
                        {formatCurrency(mrr)}
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-[var(--muted-text)]">Mensual recurrente</div>
                </div>

                <div className="p-2.5 sm:p-3 bg-purple-500/10 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-1">
                        <TrendingUp size={12} className="text-purple-500 dark:text-purple-400" />
                        <span className="text-[10px] font-medium text-purple-500 dark:text-purple-400 uppercase tracking-wide">ARR</span>
                    </div>
                    <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-[var(--foreground)]">
                        {formatCurrency(arr)}
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-[var(--muted-text)]">Anual recurrente</div>
                </div>

                <div className="p-2.5 sm:p-3 bg-warning-amber/10 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-1">
                        <TrendingUp size={12} className="text-warning-amber" />
                        <span className="text-[10px] font-medium text-warning-amber uppercase tracking-wide">Pipeline</span>
                    </div>
                    <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-[var(--foreground)]">
                        {formatCurrency(pipelineValue)}
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-[var(--muted-text)]">En negociación</div>
                </div>

                <div className="p-2.5 sm:p-3 bg-success-green/10 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-1">
                        <DollarSign size={12} className="text-success-green" />
                        <span className="text-[10px] font-medium text-success-green uppercase tracking-wide">Ganado</span>
                    </div>
                    <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-[var(--foreground)]">
                        {formatCurrency(wonValue)}
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-[var(--muted-text)]">Cierres exitosos</div>
                </div>
            </div>
        </div>
    );
}
