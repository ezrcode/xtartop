"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
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
    PROSPECCION: "#94a3b8",
    CALIFICACION: "#60a5fa",
    NEGOCIACION: "#fbbf24",
    FORMALIZACION: "#a78bfa",
    CIERRE_GANADO: "#22c55e",
    CIERRE_PERDIDO: "#ef4444",
    NO_CALIFICADOS: "#6b7280",
};

const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
};

export function DealsPipeline({ data }: DealsPipelineProps) {
    const totalValue = useMemo(() => data.reduce((acc, d) => acc + d.value, 0), [data]);
    const totalDeals = useMemo(() => data.reduce((acc, d) => acc + d.count, 0), [data]);

    // Filter out stages with 0 deals for cleaner visualization
    const filteredData = data.filter(d => d.count > 0);

    if (filteredData.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-graphite-gray p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-nearby-dark">Pipeline de Negocios</h3>
                    <TrendingUp size={18} className="text-gray-400" />
                </div>
                <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                    No hay negocios registrados
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-graphite-gray p-5">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-nearby-dark">Pipeline de Negocios</h3>
                <Link href="/app/deals" className="text-xs text-nearby-accent hover:underline">
                    Ver todos
                </Link>
            </div>
            
            <div className="flex items-baseline gap-2 mb-4">
                <span className="text-2xl font-bold text-nearby-dark">{totalDeals}</span>
                <span className="text-sm text-gray-500">negocios · {formatCurrency(totalValue)}</span>
            </div>

            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredData} layout="vertical" margin={{ left: 0, right: 10 }}>
                        <XAxis type="number" hide />
                        <YAxis 
                            type="category" 
                            dataKey="label" 
                            width={90}
                            tick={{ fontSize: 11, fill: "#6b7280" }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            formatter={(value, name, props) => [
                                `${(props.payload as any).count} negocios · ${formatCurrency((props.payload as any).value)}`,
                                (props.payload as any).label
                            ]}
                            contentStyle={{
                                backgroundColor: "#fff",
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                                fontSize: "12px",
                            }}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                            {filteredData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={stageColors[entry.stage] || "#94a3b8"} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
