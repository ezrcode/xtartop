"use client";

import { Building2 } from "lucide-react";
import Link from "next/link";

interface CompaniesByStatusData {
    status: string;
    label: string;
    count: number;
}

interface CompaniesByStatusProps {
    data: CompaniesByStatusData[];
}

const statusColors: Record<string, string> = {
    PROSPECTO: "bg-slate-400",
    POTENCIAL: "bg-blue-400",
    CLIENTE: "bg-green-500",
    ALIADO: "bg-purple-400",
    INACTIVO: "bg-gray-400",
};

export function CompaniesByStatus({ data }: CompaniesByStatusProps) {
    const total = data.reduce((acc, d) => acc + d.count, 0);
    const filteredData = data.filter(d => d.count > 0);

    if (total === 0) {
        return (
            <div className="bg-white rounded-xl border border-graphite-gray p-4 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-nearby-dark">Empresas por Estado</h3>
                    <Building2 size={18} className="text-gray-400" />
                </div>
                <div className="flex items-center justify-center h-40 sm:h-48 text-gray-400 text-sm">
                    No hay empresas registradas
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-graphite-gray p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-sm font-semibold text-nearby-dark">Empresas por Estado</h3>
                <Link 
                    href="/app/companies" 
                    className="text-xs text-nearby-accent hover:underline py-1 px-2 -mr-2 rounded-lg active:bg-nearby-accent/10"
                >
                    Ver todas
                </Link>
            </div>

            {/* Donut chart representation with CSS */}
            <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 sm:w-28 sm:h-28">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        {filteredData.reduce((acc, item, index) => {
                            const percentage = (item.count / total) * 100;
                            const offset = acc.offset;
                            const colorClass = statusColors[item.status]?.replace('bg-', '') || 'gray-400';
                            const colorMap: Record<string, string> = {
                                'slate-400': '#94a3b8',
                                'blue-400': '#60a5fa',
                                'green-500': '#22c55e',
                                'purple-400': '#a78bfa',
                                'gray-400': '#9ca3af',
                            };
                            acc.elements.push(
                                <circle
                                    key={item.status}
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    fill="transparent"
                                    stroke={colorMap[colorClass] || '#9ca3af'}
                                    strokeWidth="16"
                                    strokeDasharray={`${percentage * 2.51} ${251 - percentage * 2.51}`}
                                    strokeDashoffset={-offset * 2.51}
                                />
                            );
                            acc.offset += percentage;
                            return acc;
                        }, { elements: [] as React.ReactNode[], offset: 0 }).elements}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-lg sm:text-xl font-bold text-nearby-dark">{total}</span>
                        <span className="text-[10px] text-gray-500">total</span>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex-1 space-y-1.5">
                    {filteredData.map((item) => (
                        <div key={item.status} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${statusColors[item.status] || 'bg-gray-400'}`} />
                                <span className="text-gray-600">{item.label}</span>
                            </div>
                            <span className="font-medium text-nearby-dark">{item.count}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
