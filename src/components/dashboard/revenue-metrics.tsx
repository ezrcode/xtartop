"use client";

import { DollarSign, TrendingUp, Calendar } from "lucide-react";

interface RevenueMetricsProps {
    mrr: number;
    arr: number;
    pipelineValue: number;
    wonValue: number;
}

const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
};

export function RevenueMetrics({ mrr, arr, pipelineValue, wonValue }: RevenueMetricsProps) {
    return (
        <div className="bg-white rounded-xl border border-graphite-gray p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-nearby-dark">Ingresos</h3>
                <DollarSign size={18} className="text-gray-400" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* MRR */}
                <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-1">
                        <Calendar size={12} className="text-blue-600" />
                        <span className="text-[10px] font-medium text-blue-600 uppercase tracking-wide">MRR</span>
                    </div>
                    <div className="text-lg font-bold text-blue-700">
                        {formatCurrency(mrr)}
                    </div>
                    <div className="text-[10px] text-blue-500">Mensual recurrente</div>
                </div>

                {/* ARR */}
                <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-1">
                        <TrendingUp size={12} className="text-purple-600" />
                        <span className="text-[10px] font-medium text-purple-600 uppercase tracking-wide">ARR</span>
                    </div>
                    <div className="text-lg font-bold text-purple-700">
                        {formatCurrency(arr)}
                    </div>
                    <div className="text-[10px] text-purple-500">Anual recurrente</div>
                </div>

                {/* Pipeline Value */}
                <div className="p-3 bg-amber-50 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-1">
                        <TrendingUp size={12} className="text-amber-600" />
                        <span className="text-[10px] font-medium text-amber-600 uppercase tracking-wide">Pipeline</span>
                    </div>
                    <div className="text-lg font-bold text-amber-700">
                        {formatCurrency(pipelineValue)}
                    </div>
                    <div className="text-[10px] text-amber-500">En negociación</div>
                </div>

                {/* Won Value */}
                <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-1">
                        <DollarSign size={12} className="text-green-600" />
                        <span className="text-[10px] font-medium text-green-600 uppercase tracking-wide">Ganado</span>
                    </div>
                    <div className="text-lg font-bold text-green-700">
                        {formatCurrency(wonValue)}
                    </div>
                    <div className="text-[10px] text-green-500">Cierres exitosos</div>
                </div>
            </div>
        </div>
    );
}
