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

const stageColors: Record<string, string> = {
    PROSPECCION: "bg-slate-400",
    CALIFICACION: "bg-blue-400",
    NEGOCIACION: "bg-amber-400",
    FORMALIZACION: "bg-purple-400",
    CIERRE_GANADO: "bg-green-500",
    CIERRE_PERDIDO: "bg-red-400",
    NO_CALIFICADOS: "bg-gray-400",
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
            <div className="bg-white rounded-xl border border-graphite-gray p-4 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-nearby-dark">Pipeline de Negocios</h3>
                    <TrendingUp size={18} className="text-gray-400" />
                </div>
                <div className="flex items-center justify-center h-40 sm:h-48 text-gray-400 text-sm">
                    No hay negocios registrados
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-graphite-gray p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-nearby-dark">Pipeline de Negocios</h3>
                <Link 
                    href="/app/deals" 
                    className="text-xs text-nearby-accent hover:underline py-1 px-2 -mr-2 rounded-lg active:bg-nearby-accent/10"
                >
                    Ver todos
                </Link>
            </div>
            
            <div className="flex items-baseline gap-2 mb-3 sm:mb-4">
                <span className="text-xl sm:text-2xl font-bold text-nearby-dark">{totalDeals}</span>
                <span className="text-xs sm:text-sm text-gray-500">negocios · {formatCurrency(totalValue)}</span>
            </div>

            <div className="space-y-2">
                {filteredData.map((stage) => (
                    <div key={stage.stage} className="flex items-center gap-2">
                        <span className="text-[10px] sm:text-xs text-gray-600 w-20 truncate">{stage.label}</span>
                        <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                            <div 
                                className={`h-full ${stageColors[stage.stage] || 'bg-gray-400'} transition-all duration-500`}
                                style={{ width: `${(stage.count / maxCount) * 100}%` }}
                            />
                        </div>
                        <span className="text-xs font-medium text-gray-700 w-6 text-right">{stage.count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
